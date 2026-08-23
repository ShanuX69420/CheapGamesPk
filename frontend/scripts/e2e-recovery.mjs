/**
 * Checks the "find your order" flow: locally remembered orders show up, and
 * the email form reports success without revealing whether the address exists.
 */
import { chromium } from "playwright";
import path from "node:path";

const SHOTS = process.argv[2] ?? ".";
const BASE = "http://localhost:3000";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

const problems = [];
const check = (label, ok, detail = "") => {
  console.log(`  [${ok ? "PASS" : "FAIL"}] ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) problems.push(label);
};

// A fresh browser has no remembered orders.
await page.goto(`${BASE}/order/find`, { waitUntil: "networkidle" });
check("find page renders", await page.getByRole("heading", { name: /find your order/i }).isVisible());
check(
  "no device history on a fresh browser",
  !(await page.getByText(/orders from this device/i).isVisible().catch(() => false)),
);

// Place an order so the browser remembers one, then come back.
await page.goto(`${BASE}/product/football-manager-2026-in-game-editor`, {
  waitUntil: "networkidle",
});
await page.getByRole("button", { name: /add to cart/i }).click();
await page.goto(`${BASE}/checkout`, { waitUntil: "networkidle" });
await page.locator('input[type="email"]').fill("recovery@buyer.pk");
await page.waitForTimeout(400);
await page.getByRole("button", { name: /place order/i }).click();
await page.waitForURL("**/order/**", { timeout: 20000 });
const placed = page.url().match(/order\/([A-Z0-9-]+)/)?.[1];

await page.goto(`${BASE}/order/find`, { waitUntil: "networkidle" });
check("device history appears after ordering", await page.getByText(/orders from this device/i).isVisible());
check("the new order is listed", await page.getByText(placed).first().isVisible(), placed);

// The email form should report success generically.
await page.locator('input[type="email"]').fill("recovery@buyer.pk");
await page.getByRole("button", { name: /send my order links/i }).click();
const known = await page
  .getByText(/if we have orders for that address/i)
  .textContent({ timeout: 15000 })
  .catch(() => null);
check("known address gets the generic reply", Boolean(known), known?.slice(0, 46));

await page.screenshot({ path: path.join(SHOTS, "flow-find-order.png"), fullPage: true });

// An address with no orders must produce the identical message.
await page.reload({ waitUntil: "networkidle" });
await page.locator('input[type="email"]').fill("nobody-here@buyer.pk");
await page.getByRole("button", { name: /send my order links/i }).click();
const unknown = await page
  .getByText(/if we have orders for that address/i)
  .textContent({ timeout: 15000 })
  .catch(() => null);
check("unknown address gets the same reply", known === unknown, unknown ? "identical" : "missing");

await browser.close();
console.log(problems.length ? `\nFAILURES: ${problems.join(", ")}` : "\nAll checks passed.");
console.log(`ORDER_NUMBER=${placed}`);
process.exit(problems.length ? 1 : 0);
