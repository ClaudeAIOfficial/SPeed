const FRAME_COUNT = 361;
const FRAME_RATE = 24;
const FRAME_PATH = (index) =>
  `/frames/frame_${String(index + 1).padStart(4, "0")}.webp`;

const canvas = document.querySelector("#frameCanvas");
const context = canvas.getContext("2d", { alpha: false, desynchronized: true });
const poster = document.querySelector("#poster");
const loader = document.querySelector("#loader");
const loaderFill = document.querySelector("#loaderFill");
const loaderPercent = document.querySelector("#loaderPercent");
const progressFill = document.querySelector("#progressFill");
const progressText = document.querySelector("#progressText");
const chapterIndex = document.querySelector("#chapterIndex");
const chapterLabel = document.querySelector("#chapterLabel");

document.body.classList.add("is-loading");

const compressedFrames = new Array(FRAME_COUNT);
const bitmapCache = new Map();
const decoding = new Map();
const MAX_BITMAPS = 30;

let targetProgress = 0;
let visualProgress = 0;
let lastRenderedFrame = -1;
let frameDirection = 1;
let isReady = false;

const chapters = [
  { end: 0.16, index: "01", label: "THE FALL" },
  { end: 0.36, index: "02", label: "THE SILENCE" },
  { end: 0.56, index: "03", label: "THE ARRIVAL" },
  { end: 0.76, index: "04", label: "THE ARROW" },
  { end: 0.91, index: "05", label: "THE RETURN" },
  { end: 1.00, index: "06", label: "THE GUARDIAN" },
];

const storyTimeline = gsap.timeline({ paused: true, defaults: { ease: "none" } });
const panels = gsap.utils.toArray(".story-panel");
gsap.set(panels, { autoAlpha: 0, y: 24 });

const ranges = [
  [0.000, 0.125],
  [0.150, 0.300],
  [0.350, 0.500],
  [0.550, 0.700],
  [0.745, 0.875],
  [0.900, 1.000],
];

ranges.forEach(([start, end], panelIndex) => {
  const panel = panels[panelIndex];
  const fade = panelIndex === panels.length - 1 ? 0.035 : 0.025;

  storyTimeline
    .to(panel, { autoAlpha: 1, y: 0, duration: fade }, start)
    .to(
      panel,
      {
        autoAlpha: panelIndex === panels.length - 1 ? 1 : 0,
        y: panelIndex === panels.length - 1 ? 0 : -18,
        duration: fade,
      },
      Math.max(start + fade, end - fade)
    );
});

storyTimeline
  .fromTo(
    ".scene-light--one",
    { scale: 0.35, opacity: 0.03 },
    { scale: 1.35, opacity: 0.34, duration: 0.55 },
    0.38
  )
  .fromTo(
    ".scene-light--two",
    { scale: 0.5, opacity: 0 },
    { scale: 1.2, opacity: 0.18, duration: 0.38 },
    0.60
  );

function setLoaderProgress(done) {
  const percent = Math.round((done / FRAME_COUNT) * 100);
  loaderFill.style.width = `${percent}%`;
  loaderPercent.textContent = `${percent}%`;
}

async function fetchFrame(index) {
  const response = await fetch(FRAME_PATH(index), { cache: "force-cache" });
  if (!response.ok) throw new Error(`Failed to load frame ${index + 1}`);
  return response.blob();
}

async function preloadCompressedFrames() {
  const concurrency = 12;
  let cursor = 0;
  let completed = 0;

  async function worker() {
    while (cursor < FRAME_COUNT) {
      const index = cursor++;
      compressedFrames[index] = await fetchFrame(index);
      completed += 1;
      setLoaderProgress(completed);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
}

function touchBitmap(index, bitmap) {
  if (bitmapCache.has(index)) bitmapCache.delete(index);
  bitmapCache.set(index, bitmap);

  while (bitmapCache.size > MAX_BITMAPS) {
    const [oldestIndex, oldestBitmap] = bitmapCache.entries().next().value;
    bitmapCache.delete(oldestIndex);
    if (oldestBitmap && typeof oldestBitmap.close === "function") {
      oldestBitmap.close();
    }
  }
}

async function blobToDrawable(blob) {
  if ("createImageBitmap" in window) {
    return createImageBitmap(blob);
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Frame decode failed"));
    };
    image.src = url;
  });
}

function ensureBitmap(index) {
  index = Math.max(0, Math.min(FRAME_COUNT - 1, index));

  if (bitmapCache.has(index)) {
    const bitmap = bitmapCache.get(index);
    touchBitmap(index, bitmap);
    return Promise.resolve(bitmap);
  }

  if (decoding.has(index)) return decoding.get(index);

  const promise = blobToDrawable(compressedFrames[index])
    .then((bitmap) => {
      touchBitmap(index, bitmap);
      decoding.delete(index);
      return bitmap;
    })
    .catch((error) => {
      decoding.delete(index);
      throw error;
    });

  decoding.set(index, promise);
  return promise;
}

function warmFrames(center, direction = 1) {
  const order = [0, direction, direction * 2, -direction, direction * 3, -direction * 2,
    direction * 4, direction * 5, -direction * 3, direction * 6];

  order.forEach((offset) => {
    const index = Math.max(0, Math.min(FRAME_COUNT - 1, center + offset));
    ensureBitmap(index).catch(() => {});
  });
}

function resizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
  canvas.width = Math.round(window.innerWidth * ratio);
  canvas.height = Math.round(window.innerHeight * ratio);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  lastRenderedFrame = -1;
}

function drawCover(drawable) {
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const sourceWidth = drawable.width;
  const sourceHeight = drawable.height;

  const scale = Math.max(canvasWidth / sourceWidth, canvasHeight / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  const x = (canvasWidth - drawWidth) / 2;
  const y = (canvasHeight - drawHeight) / 2;

  context.fillStyle = "#020807";
  context.fillRect(0, 0, canvasWidth, canvasHeight);
  context.drawImage(drawable, x, y, drawWidth, drawHeight);
}

async function renderFrame(index) {
  if (index === lastRenderedFrame) return;

  const bitmap = bitmapCache.get(index) || await ensureBitmap(index);
  drawCover(bitmap);
  lastRenderedFrame = index;

  if (!canvas.classList.contains("is-ready")) {
    canvas.classList.add("is-ready");
    poster.classList.add("is-hidden");
  }
}

function updateInterface(progress) {
  const percent = Math.round(progress * 100);
  progressFill.style.width = `${percent}%`;
  progressText.textContent = String(percent).padStart(2, "0");

  const chapter = chapters.find((item) => progress <= item.end) || chapters.at(-1);
  chapterIndex.textContent = chapter.index;
  chapterLabel.textContent = chapter.label;
}

function animationLoop() {
  const previous = visualProgress;
  const distance = targetProgress - visualProgress;

  // Framerate-independent easing: quick enough to feel responsive, slow enough
  // to move through the sequence like a playing film.
  visualProgress += distance * 0.105;

  if (Math.abs(distance) < 0.00004) visualProgress = targetProgress;

  frameDirection = visualProgress >= previous ? 1 : -1;
  const frame = Math.max(
    0,
    Math.min(FRAME_COUNT - 1, Math.round(visualProgress * (FRAME_COUNT - 1)))
  );

  warmFrames(frame, frameDirection);
  renderFrame(frame).catch(console.error);
  storyTimeline.progress(visualProgress);
  updateInterface(visualProgress);

  requestAnimationFrame(animationLoop);
}

function setupSmoothScroll() {
  const lenis = new Lenis({
    duration: 1.05,
    smoothWheel: true,
    wheelMultiplier: 0.9,
    touchMultiplier: 1.05,
    syncTouch: false,
  });

  lenis.on("scroll", (event) => {
    const next = Math.max(0, Math.min(1, event.progress));
    frameDirection = next >= targetProgress ? 1 : -1;
    targetProgress = next;

    const targetFrame = Math.round(targetProgress * (FRAME_COUNT - 1));
    warmFrames(targetFrame, frameDirection);
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }

  requestAnimationFrame(raf);
}

async function init() {
  resizeCanvas();

  try {
    await preloadCompressedFrames();

    // Decode enough adjacent frames before revealing the site.
    await Promise.all(
      Array.from({ length: 18 }, (_, index) => ensureBitmap(index))
    );

    await renderFrame(0);
    isReady = true;

    loader.classList.add("is-hidden");
    document.body.classList.remove("is-loading");

    setupSmoothScroll();
    animationLoop();
  } catch (error) {
    console.error(error);
    loaderPercent.textContent = "LOAD ERROR";
  }
}

window.addEventListener("resize", resizeCanvas, { passive: true });

document.querySelectorAll('a[href="#"]').forEach((link) => {
  link.addEventListener("click", (event) => event.preventDefault());
});

init();
