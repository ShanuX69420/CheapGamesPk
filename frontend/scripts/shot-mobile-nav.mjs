import { chromium } from "playwright";
import path from "node:path";

const SHOTS = process.argv[2] ?? ".";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

const problems = [];
const check = (l, ok, d = "") => {
  console.log(`  [${ok ? "PASS" : "FAIL"}] ${l}${d ? ` — ${d}` : ""}`);
  if (!ok) problems.push(l);
};

await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
const toggle = page.getByRole("button", { name: /open menu/i });
check("hamburger visible on mobile", await toggle.isVisible());
check("desktop nav hidden", !(await page.locator("header nav a", { hasText: "Deals" }).first().isVisible().catch(() => false)));
await page.screenshot({ path: path.join(SHOTS, "nav-closed.png") });

await toggle.click();
await page.waitForTimeout(250);
check("menu opens", await page.locator("#mobile-nav").isVisible());
const links = await page.locator("#mobile-nav a").allTextContents();
check("all nav links present", links.length >= 5, links.join(", "));
await page.screenshot({ path: path.join(SHOTS, "nav-open.png") });

await page.keyboard.press("Escape");
await page.waitForTimeout(250);
check("Escape closes", (await page.locator("#mobile-nav").count()) === 0);

await toggle.click();
await page.waitForTimeout(200);
await page.locator("#mobile-nav a", { hasText: "Keys" }).first().click();
await page.waitForURL("**/?type=key", { timeout: 10000 });
check("link navigates and closes menu", (await page.locator("#mobile-nav").count()) === 0, page.url());

// Desktop must be unchanged.
await page.setViewportSize({ width: 1280, height: 800 });
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
check("hamburger hidden on desktop", !(await page.getByRole("button", { name: /open menu/i }).isVisible().catch(() => false)));
check("desktop nav visible", await page.locator("header nav a", { hasText: "Deals" }).first().isVisible());

await browser.close();
console.log(problems.length ? `\nFAILURES: ${problems.join(", ")}` : "\nAll checks passed.");
process.exit(problems.length ? 1 : 0);
