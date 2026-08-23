import { chromium } from "playwright";

const OUT = process.argv[2];
const URL =
  process.argv[3] ?? "http://localhost:3000/product/mortal-kombat-1-premium-edition";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(URL, { waitUntil: "networkidle" });

// Walk the page so images below the fold actually request.
await page.evaluate(async () => {
  const step = 400;
  for (let y = 0; y < document.body.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 120));
  }
  window.scrollTo(0, 0);
});

await page.waitForLoadState("networkidle");
await page.waitForTimeout(600);
await page.screenshot({ path: OUT, fullPage: true });

const broken = await page.evaluate(() =>
  [...document.querySelectorAll("img")]
    .filter((i) => !i.complete || i.naturalWidth === 0)
    .map((i) => i.src),
);
console.log("images that failed to load:", broken.length ? broken : "none");

await browser.close();
