/**
 * Checks what the pixel actually reports, without letting anything reach Meta.
 *
 * fbevents.js is blocked, so `fbq` stays the queueing stub the base snippet
 * installs — which means every call the site makes is still sitting in
 * `fbq.queue` where it can be read back.
 *
 * Needs a server started with a pixel id, since without one there is no pixel
 * to check:
 *
 *   NEXT_PUBLIC_FACEBOOK_PIXEL_ID=1234567890123456 npm run dev
 *   npm run e2e:pixel
 *
 * Any id will do — nothing here is allowed to reach Meta. This is why it is
 * not in the `e2e` chain, which runs against a plain dev server.
 */
import { chromium } from "playwright";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

const PIXEL_ID = "1234567890123456";

const problems = [];
const check = (label, ok, detail = "") => {
  console.log(`  [${ok ? "PASS" : "FAIL"}] ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) problems.push(label);
};

await ctx.route("https://connect.facebook.net/**", (route) => route.abort());
await ctx.route("https://www.facebook.com/**", (route) => route.abort());
await ctx.route("https://wa.me/**", (route) =>
  route.fulfill({ status: 200, contentType: "text/html", body: "<p>stub</p>" }),
);

// Stand in for the cookies a pixel that was allowed to load would have written.
await ctx.addCookies([
  { name: "_fbp", value: "fb.1.1750000000000.987654321", domain: "localhost", path: "/" },
  { name: "_fbc", value: "fb.1.1750000000000.IwAR0test", domain: "localhost", path: "/" },
]);

let orderPayload = null;
page.on("request", (request) => {
  if (request.method() === "POST" && request.url().includes("/api/orders/")) {
    orderPayload = JSON.parse(request.postData() ?? "{}");
  }
});

const queue = () =>
  page.evaluate(() =>
    (window.fbq?.queue ?? []).map((args) => Array.from(args)),
  );

// --- a product page ---------------------------------------------------------

await page.goto("http://localhost:3000/product/cyberpunk-2077-ultimate-edition", {
  waitUntil: "networkidle",
});

let events = await queue();
console.log(JSON.stringify(events, null, 1));

if (!events.length) {
  console.error(
    "No pixel on the page. Start the server with " +
      `NEXT_PUBLIC_FACEBOOK_PIXEL_ID=${PIXEL_ID} first.`,
  );
  await browser.close();
  process.exit(1);
}

check("the pixel initialises", events.some((e) => e[0] === "init" && e[1] === PIXEL_ID));
check("reports a PageView", events.filter((e) => e[1] === "PageView").length === 1);

const viewContent = events.find((e) => e[1] === "ViewContent");
check("reports ViewContent for the product", Boolean(viewContent));
check(
  "ViewContent names the product and its price",
  viewContent?.[2]?.content_ids?.[0] === "cyberpunk-2077-ultimate-edition" &&
    typeof viewContent?.[2]?.value === "number" &&
    viewContent?.[2]?.currency === "PKR",
  JSON.stringify(viewContent?.[2]),
);

// --- adding to the cart -----------------------------------------------------

await page.getByRole("button", { name: /add to cart/i }).click();
events = await queue();
check("reports AddToCart", events.some((e) => e[1] === "AddToCart"));

// --- buying -----------------------------------------------------------------

const popupPromise = ctx.waitForEvent("page", { timeout: 20000 });
await page.getByRole("button", { name: /buy now on whatsapp/i }).click();
await popupPromise;
await page.getByText(/is with us/).waitFor({ timeout: 20000 });

events = await queue();
const lead = events.find((e) => e[1] === "Lead");
check("reports a Lead when the buyer clicks through", Boolean(lead));
check(
  "the Lead carries the basket and its value",
  lead?.[2]?.content_ids?.[0] === "cyberpunk-2077-ultimate-edition" &&
    typeof lead?.[2]?.value === "number" &&
    /^CGP-[A-Z0-9]{6}$/.test(lead?.[2]?.order_id ?? ""),
  JSON.stringify(lead?.[2]),
);
check(
  "the Lead is keyed on the order so the server's copy dedupes",
  lead?.[3]?.eventID === `lead.${lead?.[2]?.order_id}`,
  lead?.[3]?.eventID,
);
check("no Purchase is reported from the browser", !events.some((e) => e[1] === "Purchase"));

check("the order carried _fbp", orderPayload?.fbp === "fb.1.1750000000000.987654321", orderPayload?.fbp);
check("the order carried _fbc", orderPayload?.fbc === "fb.1.1750000000000.IwAR0test", orderPayload?.fbc);
check(
  "the order carried the page it was placed from",
  /\/product\/cyberpunk-2077-ultimate-edition$/.test(orderPayload?.source_url ?? ""),
  orderPayload?.source_url,
);

// --- moving around ----------------------------------------------------------

const before = (await queue()).filter((e) => e[1] === "PageView").length;
await page.getByRole("link", { name: /back to catalog/i }).click();
await page.waitForURL("http://localhost:3000/");
await page.waitForTimeout(500);
const after = (await queue()).filter((e) => e[1] === "PageView").length;
check("a client-side navigation reports another PageView", after === before + 1, `${before} -> ${after}`);

// A blocked pixel must not take anything else down with it.
check("the storefront still works with fbevents.js blocked", await page.getByRole("link", { name: /^cheap/ }).isVisible());

// --- arriving from an ad with no cookies to show for it ----------------------

// The pixel writes _fbc from Meta's ?fbclid, but a blocked pixel never gets
// the chance, so the click id has to be salvaged from the URL instead.
const blocked = await browser.newContext();
await blocked.route("https://connect.facebook.net/**", (route) => route.abort());
await blocked.route("https://wa.me/**", (route) =>
  route.fulfill({ status: 200, contentType: "text/html", body: "<p>stub</p>" }),
);

let fromAd = null;
const adPage = await blocked.newPage();
adPage.on("request", (request) => {
  if (request.method() === "POST" && request.url().includes("/api/orders/")) {
    fromAd = JSON.parse(request.postData() ?? "{}");
  }
});

await adPage.goto(
  "http://localhost:3000/product/cyberpunk-2077-ultimate-edition?fbclid=TESTCLICKID",
  { waitUntil: "networkidle" },
);
const adPopup = blocked.waitForEvent("page", { timeout: 20000 });
await adPage.getByRole("button", { name: /buy now on whatsapp/i }).click();
await adPopup;
await adPage.getByText(/is with us/).waitFor({ timeout: 20000 });

check(
  "an ad click still reaches the order without a cookie",
  /^fb\.1\.\d+\.TESTCLICKID$/.test(fromAd?.fbc ?? ""),
  fromAd?.fbc,
);

await browser.close();
console.log(problems.length ? `\nFAILURES: ${problems.join(", ")}` : "\nAll checks passed.");
process.exit(problems.length ? 1 : 0);
