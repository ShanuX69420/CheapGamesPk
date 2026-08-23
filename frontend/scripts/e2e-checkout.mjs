/**
 * Drives the full buy flow in a real browser: add to cart -> checkout ->
 * order page -> credential reveal after delivery.
 *
 * Usage: node scripts/e2e-checkout.mjs [shotsDir]
 */
import { chromium } from "playwright";
import path from "node:path";

const SHOTS = process.argv[2] ?? ".";
const BASE = "http://localhost:3000";
const PRODUCT = "/product/resident-evil-requiem-deluxe";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

const problems = [];
const check = (label, ok, detail = "") => {
  console.log(`  [${ok ? "PASS" : "FAIL"}] ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) problems.push(label);
};

// 1. Product page shows the two buy buttons.
await page.goto(BASE + PRODUCT, { waitUntil: "networkidle" });
const addBtn = page.getByRole("button", { name: /add to cart/i });
const waBtn = page.getByRole("button", { name: /buy now on whatsapp/i });
check("Add to cart button present", await addBtn.isVisible());
check("WhatsApp button present", await waBtn.isVisible());

// 2. Adding updates the header badge.
await addBtn.click();
await page.waitForTimeout(300);
const badge = await page
  .locator('header a[href="/cart"] span')
  .first()
  .textContent()
  .catch(() => null);
check("cart badge shows 1", badge?.trim() === "1", `badge=${badge}`);

// 3. Cart page lists the line.
await page.goto(BASE + "/cart", { waitUntil: "networkidle" });
check("cart lists product", await page.getByText(/Resident Evil Requiem/i).first().isVisible());

// 4. Checkout.
await page.getByRole("link", { name: /^checkout$/i }).click();
await page.waitForURL("**/checkout");
await page.locator('input[type="email"]').fill("e2e@buyer.pk");
await page.waitForTimeout(400);
check("payment methods loaded", (await page.locator('input[name="payment_method"]').count()) > 0);

await page.screenshot({ path: path.join(SHOTS, "flow-checkout.png"), fullPage: true });

await page.getByRole("button", { name: /place order/i }).click();
await page.waitForURL("**/order/**", { timeout: 20000 });

const orderUrl = page.url();
const number = orderUrl.match(/order\/([A-Z0-9-]+)/)?.[1];
check("redirected to order page", Boolean(number), number);
check("status is awaiting payment", await page.getByText(/waiting for your payment/i).isVisible());
check("payment instructions shown", await page.getByText(/quote your order number/i).first().isVisible());
// The credential block renders the payload inside a <pre>; absence of that
// element is the real signal, not the heading text.
check(
  "credentials hidden before delivery",
  (await page.locator("pre").count()) === 0,
);
check("cart emptied after ordering", !(await page.locator('header a[href="/cart"] span').first().isVisible().catch(() => false)));

await page.screenshot({ path: path.join(SHOTS, "flow-order-awaiting.png"), fullPage: true });

console.log(`\nORDER_URL=${orderUrl}`);
console.log(`ORDER_NUMBER=${number}`);

await browser.close();
console.log(problems.length ? `\nFAILURES: ${problems.join(", ")}` : "\nAll checks passed.");
process.exit(problems.length ? 1 : 0);
