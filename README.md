# r/ponstreetbets

A Vercel-ready, one-frame cinematic website with smooth forward/reverse scroll playback.

## Why this version is smoother

The uploaded 15-second video was converted into **361 WebP frames at 24 FPS**. The site draws those frames to a canvas and eases through them with `requestAnimationFrame`. It does not repeatedly seek through an MP4, which is the main cause of choppy reverse scrolling.

## Deploy to Vercel

### Recommended: GitHub

1. Extract this ZIP.
2. Upload the extracted files to a new GitHub repository.
3. Import the repository into Vercel.
4. Do not change the detected settings.
5. Deploy.

The included `vercel.json` explicitly sets:

- Build command: `npm run build`
- Output directory: `dist`

There are no npm dependencies.

### Vercel CLI

```bash
npm install -g vercel
vercel
```

Run the command from the extracted project root.

## Local preview

```bash
npm run dev
```

Open `http://localhost:3000`.

## Project structure

```text
index.html
styles.css
app.js
package.json
build.mjs
dev.mjs
vercel.json
public/
  frames/
  poster.webp
  pons-logo.png
  og-banner.png
```

## Editing links

In `index.html`, replace the `href="#"` values for:

- `ENTER r/PONSTREETBETS`
- `FOLLOW THE LORE`
