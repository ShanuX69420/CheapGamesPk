/**
 * Checks the "find your order" flow: orders placed on this device show up in
 * the local history, and the email form reports success without revealing
 * whether the address has any orders.
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

/* Place an order so the browser remembers one, then come back. WhatsApp is the
   only way to order now, so the number has to come out of the chat link. */
await ctx.route("https://wa.me/**", (route) =>
  route.fulfill({ status: 200, contentType: "text/html", body: "<p>stub</p>" }),
);

await page.goto(`${BASE}/product/football-manager-2026-in-game-editor`, {
  waitUntil: "networkidle",
});
await page.getByRole("button", { name: /add to cart/i }).click();
await page.goto(`${BASE}/cart`, { waitUntil: "networkidle" });

const popupPromise = ctx.waitForEvent("page", { timeout: 20000 });
await page.getByRole("button", { name: /order on whatsapp/i }).click();
const popup = await popupPromise;
await popup.waitForURL(/wa\.me/, { timeout: 20000 }).catch(() => {});
const placed =
  decodeURIComponent(new URL(popup.url()).searchParams.get("text") ?? "").match(
    /CGP-[A-Z0-9]{6}/,
  )?.[0] ?? "";
check("ordered on WhatsApp", Boolean(placed), placed);

await page.goto(`${BASE}/order/find`, { waitUntil: "networkidle" });
check("device history appears after ordering", await page.getByText(/orders from this device/i).isVisible());
check(
  "the new order is listed",
  Boolean(placed) && (await page.getByText(placed).first().isVisible()),
  placed,
);

/* The email form must answer the same way whatever it is given — a WhatsApp
   order carries no email, so nothing here should hint at what we hold. */
await page.locator('input[type="email"]').fill("recovery@buyer.pk");
await page.getByRole("button", { name: /send my order links/i }).click();
const first = await page
  .getByText(/if we have orders for that address/i)
  .textContent({ timeout: 15000 })
  .catch(() => null);
check("the email form replies generically", Boolean(first), first?.slice(0, 46));

await page.screenshot({ path: path.join(SHOTS, "flow-find-order.png"), fullPage: true });

// A different address must produce the identical message.
await page.reload({ waitUntil: "networkidle" });
await page.locator('input[type="email"]').fill("nobody-here@buyer.pk");
await page.getByRole("button", { name: /send my order links/i }).click();
const second = await page
  .getByText(/if we have orders for that address/i)
  .textContent({ timeout: 15000 })
  .catch(() => null);
check("a second address gets the same reply", first === second, second ? "identical" : "missing");

await browser.close();
console.log(problems.length ? `\nFAILURES: ${problems.join(", ")}` : "\nAll checks passed.");
console.log(`ORDER_NUMBER=${placed}`);
process.exit(problems.length ? 1 : 0);
