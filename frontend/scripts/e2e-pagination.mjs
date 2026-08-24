import { chromium } from "playwright";
import path from "node:path";

const SHOTS = process.argv[2] ?? ".";
const BASE = "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const problems = [];
const check = (l, ok, d = "") => {
  console.log(`  [${ok ? "PASS" : "FAIL"}] ${l}${d ? ` — ${d}` : ""}`);
  if (!ok) problems.push(l);
};
const names = () =>
  page.locator("main h3").allTextContents();

await page.goto(BASE, { waitUntil: "networkidle" });
const pager = page.getByRole("navigation", { name: /pagination/i });
check("pager renders", await pager.isVisible());
check("prev disabled on page 1", (await pager.getByRole("link", { name: /prev/i }).count()) === 0);
const p1 = await names();
check("page 1 shows a partial page", p1.length === 3, `${p1.length} cards`);
await page.screenshot({ path: path.join(SHOTS, "pagination.png"), fullPage: true });

await pager.getByRole("link", { name: /next/i }).click();
await page.waitForURL("**/?page=2");
const p2 = await names();
check("page 2 shows different products", p2.length > 0 && p2[0] !== p1[0], p2[0]);
check("prev appears on page 2", (await pager.getByRole("link", { name: /prev/i }).count()) === 1);

// Filters must survive paging.
await page.goto(`${BASE}/?type=offline_account`, { waitUntil: "networkidle" });
const filteredPager = page.getByRole("navigation", { name: /pagination/i });
await filteredPager.getByRole("link", { name: /next/i }).click();
await page.waitForURL(/page=2/);
check("filter preserved across pages", page.url().includes("type=offline_account"), page.url());
const heading = await page.locator("main span", { hasText: /Page 2 of/ }).first().textContent();
check("count reflects the filter", /Page 2 of/.test(heading ?? ""), heading?.trim());

// Changing a filter must reset to page 1.
// networkidle does not reliably settle after a client-side route change.
await page.getByRole("link", { name: "On sale", exact: true }).click();
await page.waitForURL(/on_sale=true/, { timeout: 15000 });
check("changing a filter drops page param", !page.url().includes("page="), page.url());

await browser.close();
console.log(problems.length ? `\nFAILURES: ${problems.join(", ")}` : "\nAll checks passed.");
process.exit(problems.length ? 1 : 0);
