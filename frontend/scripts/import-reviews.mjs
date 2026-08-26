/**
 * One-off: pull the review screenshots out of Downloads, shrink them and drop
 * them into public/reviews/ as webp. Screenshots with a visible credential or
 * a customer handle are skipped by name — check any new batch before adding it.
 */
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SRC = "C:/Users/Pc/Downloads/Reviews and stuff";
const OUT = path.join(import.meta.dirname, "..", "public", "reviews");

// 2586 + 2628 show a Steam login/password in the chat, 2699 a customer's IG
// handle and name.
const SKIP = new Set(["IMG_2586.PNG", "IMG_2628.PNG", "IMG_2699.PNG"]);

await mkdir(OUT, { recursive: true });

const files = (await readdir(SRC)).filter((f) => f.toUpperCase().endsWith(".PNG"));
for (const file of files) {
  if (SKIP.has(file.toUpperCase())) {
    console.log(`skip  ${file}`);
    continue;
  }
  const isProfile = file.toLowerCase() === "profile.png";
  const name = isProfile ? "profile" : file.replace(/\.PNG$/i, "").toLowerCase().replace("img_", "review-");
  const out = path.join(OUT, `${name}.webp`);
  await sharp(path.join(SRC, file))
    .resize({ width: isProfile ? 720 : 560 })
    .webp({ quality: 72 })
    .toFile(out);
  console.log(`ok    ${file} -> ${name}.webp`);
}
