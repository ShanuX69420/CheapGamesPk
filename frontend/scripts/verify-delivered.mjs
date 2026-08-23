import { chromium } from "playwright";
import path from "node:path";

const [SHOTS, URL] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(URL, { waitUntil: "networkidle" });

const problems = [];
const check = (label, ok, detail = "") => {
  console.log(`  [${ok ? "PASS" : "FAIL"}] ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) problems.push(label);
};

check("status reads delivered", await page.getByText(/your order is ready/i).isVisible());
const payloads = await page.locator("pre").allTextContents();
check("credentials revealed", payloads.length > 0, payloads.join(" | "));
check("setup instructions available", (await page.locator("details").count()) > 0);

await page.screenshot({ path: path.join(SHOTS, "flow-order-delivered.png"), fullPage: true });

// The token must still be required after delivery.
const noToken = URL.split("?")[0];
await page.goto(noToken, { waitUntil: "networkidle" });
check("order page still gated without token", await page.getByText(/order not found/i).isVisible());

await browser.close();
console.log(problems.length ? `\nFAILURES: ${problems.join(", ")}` : "\nAll checks passed.");
process.exit(problems.length ? 1 : 0);
