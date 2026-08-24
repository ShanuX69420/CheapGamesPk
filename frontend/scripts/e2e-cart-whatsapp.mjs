import { chromium } from "playwright";
import path from "node:path";

/* The cart's WhatsApp button is the second way into the chat handoff. It has
   its own hazard the product page does not: ordering empties the cart, so the
   page must show the confirmation rather than falling through to "your cart is
   empty". */

const SHOTS = process.argv[2] ?? ".";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

const problems = [];
const check = (label, ok, detail = "") => {
  console.log(`  [${ok ? "PASS" : "FAIL"}] ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) problems.push(label);
};

await ctx.route("https://wa.me/**", (route) =>
  route.fulfill({ status: 200, contentType: "text/html", body: "<p>stub</p>" }),
);

await page.goto("http://localhost:3000/product/forza-horizon-6-premium-edition", {
  waitUntil: "networkidle",
});
await page.getByRole("button", { name: /add to cart/i }).click();
await page.goto("http://localhost:3000/cart", { waitUntil: "networkidle" });

const popupPromise = ctx.waitForEvent("page", { timeout: 20000 });
await page.getByRole("button", { name: /order on whatsapp/i }).click();
const popup = await popupPromise;
await popup.waitForURL(/wa\.me/, { timeout: 20000 }).catch(() => {});

const text = decodeURIComponent(new URL(popup.url()).searchParams.get("text") ?? "");
const number = text.match(/CGP-[A-Z0-9]{6}/)?.[0] ?? "";
check("opened a wa.me link with an order number", Boolean(number), number);

const handoff = page.getByText(`Order ${number} is with us`);
await handoff.waitFor({ timeout: 20000 }).catch(() => {});

check("stays on the cart page", page.url().endsWith("/cart"), page.url());
check("no redirect to an order page", !/\/order\//.test(page.url()), page.url());
check("confirms the order inline", await handoff.isVisible());

const body = await page.locator("body").innerText();
check("does not fall through to the empty-cart state", !/your cart is empty/i.test(body));
check("payment instructions are not shown", !/payment proof|awaiting payment/i.test(body));

await page.screenshot({ path: path.join(SHOTS, "flow-cart-whatsapp.png"), fullPage: true });

await browser.close();
console.log(problems.length ? `\nFAILURES: ${problems.join(", ")}` : "\nAll checks passed.");
process.exit(problems.length ? 1 : 0);
