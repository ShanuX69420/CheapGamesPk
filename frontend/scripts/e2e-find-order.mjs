/**
 * Checks the "find your order" flow: an order placed on this device shows up in
 * the local history, which is the only lookup the store has now that nothing
 * collects an email address.
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

// A fresh browser has no remembered orders, and must say so rather than
// leaving the page looking broken.
await page.goto(`${BASE}/order/find`, { waitUntil: "networkidle" });
check("find page renders", await page.getByRole("heading", { name: /find your order/i }).isVisible());
check(
  "a fresh browser is told there is nothing here",
  await page.getByText(/no orders on this device/i).isVisible(),
);
check(
  "no order lookup form survives",
  (await page.locator('input[type="email"]').count()) === 0,
);
check(
  "the chat is offered as the way back in",
  await page.getByText(/message us/i).first().isVisible(),
);

/* Place an order so the browser remembers one, then come back. WhatsApp is the
   only way to order, so the number has to come out of the chat link. */
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

// The listed order has to actually open — the token is carried in the link.
await page.getByText(placed).first().click();
await page.waitForURL(/\/order\/CGP-/, { timeout: 20000 }).catch(() => {});
check(
  "the remembered link opens the order",
  await page.getByRole("heading", { name: placed }).isVisible().catch(() => false),
);

await page.goto(`${BASE}/order/find`, { waitUntil: "networkidle" });
await page.screenshot({ path: path.join(SHOTS, "flow-find-order.png"), fullPage: true });

await browser.close();
console.log(problems.length ? `\nFAILURES: ${problems.join(", ")}` : "\nAll checks passed.");
console.log(`ORDER_NUMBER=${placed}`);
process.exit(problems.length ? 1 : 0);
