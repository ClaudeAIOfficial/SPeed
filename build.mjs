import { cp, mkdir, rm, copyFile } from "node:fs/promises";

const output = new URL("./dist/", import.meta.url);

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

await Promise.all([
  copyFile(new URL("./index.html", import.meta.url), new URL("./dist/index.html", import.meta.url)),
  copyFile(new URL("./styles.css", import.meta.url), new URL("./dist/styles.css", import.meta.url)),
  copyFile(new URL("./app.js", import.meta.url), new URL("./dist/app.js", import.meta.url)),
  cp(new URL("./public/", import.meta.url), output, { recursive: true }),
]);

console.log("r/ponstreetbets static build created in dist/");
