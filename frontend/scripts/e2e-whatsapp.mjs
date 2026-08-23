import { chromium } from "playwright";
import path from "node:path";

const SHOTS = process.argv[2] ?? ".";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

const problems = [];
const check = (label, ok, detail = "") => {
  console.log(`  [${ok ? "PASS" : "FAIL"}] ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) problems.push(label);
};

/* Stub wa.me rather than abort it — an aborted navigation leaves the popup
   on about:blank, so we could not read the URL the app actually chose. */
await ctx.route("https://wa.me/**", (route) =>
  route.fulfill({ status: 200, contentType: "text/html", body: "<p>stub</p>" }),
);

await page.goto("http://localhost:3000/product/cyberpunk-2077-ultimate-edition", {
  waitUntil: "networkidle",
});

const popupPromise = ctx.waitForEvent("page", { timeout: 20000 });
await page.getByRole("button", { name: /buy now on whatsapp/i }).click();

const popup = await popupPromise;
await popup.waitForURL(/wa\.me/, { timeout: 20000 }).catch(() => {});
const waUrl = popup.url();

check("opened a wa.me link", waUrl.includes("wa.me"), waUrl.slice(0, 60));
check("addressed to the configured number", waUrl.includes("923001234567"));

const text = decodeURIComponent(new URL(waUrl).searchParams.get("text") ?? "");
check("message names the product", /Cyberpunk 2077/i.test(text));
check("message carries an order number", /CGP-[A-Z0-9]{6}/.test(text), text.match(/CGP-[A-Z0-9]{6}/)?.[0]);
check("message states a total", /Total: PKR/.test(text));
console.log("\n--- prefilled message ---\n" + text + "\n-------------------------");

// The shopper should also land on their order page.
await page.waitForURL("**/order/**", { timeout: 20000 }).catch(() => {});
check("buyer lands on their order page", /\/order\/CGP-/.test(page.url()), page.url());
await page.screenshot({ path: path.join(SHOTS, "flow-whatsapp-order.png"), fullPage: true });

await browser.close();
console.log(problems.length ? `\nFAILURES: ${problems.join(", ")}` : "\nAll checks passed.");
process.exit(problems.length ? 1 : 0);
