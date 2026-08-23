import { chromium } from "playwright";
import path from "node:path";

const OUT = process.argv[2] ?? ".";
const TAG = process.argv[3] ?? "before";

const PAGES = [
  { name: "home",     url: "http://localhost:3000/",                                        full: true },
  { name: "product",  url: "http://localhost:3000/product/mortal-kombat-1-premium-edition", full: true },
  { name: "oos",      url: "http://localhost:3000/product/baldurs-gate-3-digital-deluxe",   full: false },
  { name: "filtered", url: "http://localhost:3000/?type=offline_account",                   full: false },
];

const browser = await chromium.launch();

for (const vp of [
  { label: "desktop", width: 1440, height: 900 },
  { label: "mobile", width: 390, height: 844 },
]) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();

  for (const target of PAGES) {
    if (vp.label === "mobile" && target.name !== "home" && target.name !== "product") continue;
    await page.goto(target.url, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(400);
    const file = path.join(OUT, `${TAG}-${target.name}-${vp.label}.png`);
    await page.screenshot({ path: file, fullPage: target.full });
    console.log("wrote", file);
  }
  await ctx.close();
}

await browser.close();
