/**
 * Downloads the catalogue photos listed in scripts/photos.json from Unsplash (free under the
 * Unsplash License) into public/images/photos as WebP. Existing files are kept.
 *   node scripts/fetch-photos.mjs
 * Products: 900×1125 (the 4:5 card ratio). Scenes: 1800 wide, for full-width sections.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const map = JSON.parse(fs.readFileSync(new URL("./photos.json", import.meta.url), "utf8"));
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "images", "photos");

const jobs = [
  ...Object.entries(map.products).map(([name, id]) => ({ file: path.join(root, "products", `${name}.webp`), url: `https://images.unsplash.com/${id}?w=900&h=1125&fit=crop&crop=entropy&q=72&fm=webp` })),
  ...Object.entries(map.scenes).map(([name, id]) => ({ file: path.join(root, "scenes", `${name}.webp`), url: `https://images.unsplash.com/${id}?w=1800&q=70&fm=webp` })),
];

let total = 0;
let failed = 0;
for (const job of jobs) {
  fs.mkdirSync(path.dirname(job.file), { recursive: true });
  if (fs.existsSync(job.file)) {
    total += fs.statSync(job.file).size;
    continue;
  }
  const res = await fetch(job.url);
  const type = res.headers.get("content-type") ?? "";
  if (!res.ok || !type.startsWith("image/")) {
    failed++;
    console.error(`FAIL ${path.basename(job.file)}: ${res.status} ${type}`);
    continue;
  }
  const bytes = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(job.file, bytes);
  total += bytes.length;
}
console.log(`${jobs.length - failed}/${jobs.length} photos in public/images/photos, ${(total / 1024 / 1024).toFixed(1)} MB`);
if (failed) process.exitCode = 1;
