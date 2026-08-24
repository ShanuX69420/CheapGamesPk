/**
 * Checks what gtag actually reports, without letting anything reach Google.
 *
 * googletagmanager.com is blocked, so `gtag` stays the stub the inline snippet
 * installs — which means every call the site makes is still sitting in
 * `dataLayer` where it can be read back.
 *
 * Needs a server started with a measurement id, since without one there is no
 * tag to check:
 *
 *   NEXT_PUBLIC_GA_MEASUREMENT_ID=G-TEST12345 npm run dev
 *   npm run e2e:ga
 *
 * Any id will do — nothing here is allowed to reach Google. This is why it is
 * not in the `e2e` chain, which runs against a plain dev server.
 */
import { chromium } from "playwright";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

const MEASUREMENT_ID = "G-TEST12345";
const SESSION_COOKIE = `_ga_${MEASUREMENT_ID.slice(2)}`;

const problems = [];
const check = (label, ok, detail = "") => {
  console.log(`  [${ok ? "PASS" : "FAIL"}] ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) problems.push(label);
};

await ctx.route("https://www.googletagmanager.com/**", (route) => route.abort());
await ctx.route("https://www.google-analytics.com/**", (route) => route.abort());
await ctx.route("https://connect.facebook.net/**", (route) => route.abort());
await ctx.route("https://wa.me/**", (route) =>
  route.fulfill({ status: 200, contentType: "text/html", body: "<p>stub</p>" }),
);

// Stand in for the cookies a tag that was allowed to load would have written.
// The session one is in GA's newer GS2 layout, where the fields are packed into
// one segment and named by letter rather than counted by position.
await ctx.addCookies([
  { name: "_ga", value: "GA1.1.1234567890.1234567890", domain: "localhost", path: "/" },
  {
    name: SESSION_COOKIE,
    value: "GS2.1.s1756000000$o3$g1$t1756000100$j60$l0$h0",
    domain: "localhost",
    path: "/",
  },
]);

let orderPayload = null;
page.on("request", (request) => {
  if (request.method() === "POST" && request.url().includes("/api/orders/")) {
    orderPayload = JSON.parse(request.postData() ?? "{}");
  }
});

// Only the event calls — `js` carries a Date and `config` a bare id, and
// neither survives a round trip through the page as anything useful.
const events = () =>
  page.evaluate(() =>
    (window.dataLayer ?? [])
      .map((args) => Array.from(args))
      .filter((args) => args[0] === "event")
      .map((args) => [args[1], args[2]]),
  );

const configured = () =>
  page.evaluate(
    (id) =>
      (window.dataLayer ?? [])
        .map((args) => Array.from(args))
        .some((args) => args[0] === "config" && args[1] === id),
    MEASUREMENT_ID,
  );

// --- a product page ---------------------------------------------------------

await page.goto("http://localhost:3000/product/cyberpunk-2077-ultimate-edition", {
  waitUntil: "networkidle",
});

let seen = await events();
console.log(JSON.stringify(seen, null, 1));

if (!(await page.evaluate(() => Boolean(window.gtag)))) {
  console.error(
    "No tag on the page. Start the server with " +
      `NEXT_PUBLIC_GA_MEASUREMENT_ID=${MEASUREMENT_ID} first.`,
  );
  await browser.close();
  process.exit(1);
}

check("the tag initialises", await configured());

const viewItem = seen.find(([name]) => name === "view_item");
check("reports view_item for the product", Boolean(viewItem));
check(
  "view_item names the product and its price",
  viewItem?.[1]?.items?.[0]?.item_id === "cyberpunk-2077-ultimate-edition" &&
    typeof viewItem?.[1]?.value === "number" &&
    viewItem?.[1]?.currency === "PKR",
  JSON.stringify(viewItem?.[1]),
);

// Enhanced measurement owns page views, so the store must not send its own.
check(
  "no page_view is reported from the store",
  !seen.some(([name]) => name === "page_view"),
);

// --- adding to the cart -----------------------------------------------------

await page.getByRole("button", { name: /add to cart/i }).click();
seen = await events();
check("reports add_to_cart", seen.some(([name]) => name === "add_to_cart"));

// --- buying -----------------------------------------------------------------

const popupPromise = ctx.waitForEvent("page", { timeout: 20000 });
await page.getByRole("button", { name: /buy now on whatsapp/i }).click();
await popupPromise;
await page.getByText(/is with us/).waitFor({ timeout: 20000 });

seen = await events();
const lead = seen.find(([name]) => name === "generate_lead");
check("reports generate_lead when the buyer clicks through", Boolean(lead));
check(
  "the lead carries the basket and its value",
  lead?.[1]?.items?.[0]?.item_id === "cyberpunk-2077-ultimate-edition" &&
    typeof lead?.[1]?.value === "number" &&
    /^CGP-[A-Z0-9]{6}$/.test(lead?.[1]?.transaction_id ?? ""),
  JSON.stringify(lead?.[1]),
);
// GA4 has no event id to dedupe on, so the server must never repeat this one.
check(
  "the lead is reported exactly once",
  seen.filter(([name]) => name === "generate_lead").length === 1,
);
check(
  "no purchase is reported from the browser",
  !seen.some(([name]) => name === "purchase"),
);

check(
  "the order carried the client id",
  orderPayload?.ga_client_id === "1234567890.1234567890",
  orderPayload?.ga_client_id,
);
check(
  "the order carried the session id out of the GS2 cookie",
  orderPayload?.ga_session_id === "1756000000",
  orderPayload?.ga_session_id,
);

// A blocked tag must not take anything else down with it.
check(
  "the storefront still works with gtag.js blocked",
  await page.getByRole("link", { name: /^cheap/ }).isVisible(),
);

// --- the older cookie layout ------------------------------------------------

// Google still serves GS1 to some visitors, where the same fields are numbered
// by position instead. A session read wrongly would quietly misfile the sale.
const older = await browser.newContext();
await older.route("https://www.googletagmanager.com/**", (route) => route.abort());
await older.route("https://connect.facebook.net/**", (route) => route.abort());
await older.route("https://wa.me/**", (route) =>
  route.fulfill({ status: 200, contentType: "text/html", body: "<p>stub</p>" }),
);
await older.addCookies([
  { name: "_ga", value: "GA1.1.55.66", domain: "localhost", path: "/" },
  {
    name: SESSION_COOKIE,
    value: "GS1.1.1683143134.4.1.1683143156.0.0.0",
    domain: "localhost",
    path: "/",
  },
]);

let fromOlder = null;
const olderPage = await older.newPage();
olderPage.on("request", (request) => {
  if (request.method() === "POST" && request.url().includes("/api/orders/")) {
    fromOlder = JSON.parse(request.postData() ?? "{}");
  }
});

await olderPage.goto(
  "http://localhost:3000/product/cyberpunk-2077-ultimate-edition",
  { waitUntil: "networkidle" },
);
const olderPopup = older.waitForEvent("page", { timeout: 20000 });
await olderPage.getByRole("button", { name: /buy now on whatsapp/i }).click();
await olderPopup;
await olderPage.getByText(/is with us/).waitFor({ timeout: 20000 });

check(
  "a GS1 session cookie is read too",
  fromOlder?.ga_client_id === "55.66" && fromOlder?.ga_session_id === "1683143134",
  JSON.stringify({ id: fromOlder?.ga_client_id, session: fromOlder?.ga_session_id }),
);

await browser.close();
console.log(problems.length ? `\nFAILURES: ${problems.join(", ")}` : "\nAll checks passed.");
process.exit(problems.length ? 1 : 0);
