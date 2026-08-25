# cheapgamespk

Storefront for selling game offline/online activations, keys, and related digital goods.

## Stack

- **backend/** — Django 5 + Django REST Framework. Owns the catalog, credential inventory,
  orders, and the back-office (Django admin).
- **frontend/** — Next.js (App Router) + TypeScript + Tailwind. Public storefront.

## Local development

### Backend

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate     # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

API at http://127.0.0.1:8000/api/ — admin at http://127.0.0.1:8000/admin/

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Storefront at http://localhost:3000

## How an order flows

There is one way to buy and it is WhatsApp. The site takes the basket and
opens the chat; everything after that happens in the conversation.

1. **Buyer orders** — "Buy now on WhatsApp" on a product page, or the same
   button in the cart to bundle several games into one chat. The order is
   written first, then the chat opens pre-filled with its number and lines.
2. **Buyer pays** using whatever you agree in the chat (JazzCash, EasyPaisa,
   bank transfer, crypto — the wording lives in the admin under Payment
   methods).
3. **You confirm** in Django admin: select the order, "Mark as paid", then
   "Mark completed — order fulfilled".
4. **Credentials appear** on the buyer's order page, if you attached a unit to
   the order line. Until delivery the API returns `null` for them, whatever
   the URL says. Completing the order is also what reports the sale to Meta
   and Google — see [Ads and analytics tracking](#ads-and-analytics-tracking).

Nothing is reserved and nothing runs out. What we sell is an offline
activation that can be handed out repeatedly, so every active listing is
always sellable and fulfilment is manual. Stock items are a credential
library for staff, not a pool that orders draw down — hide a listing with
`is_active` if you need it off the shelf.

The store sends no email at all — there is no SMTP config, no from-address and
no mail templates. Nothing on the site ever asks for an address, so there would
be nobody to write to. Confirmation, payment, delivery and support all happen in
the one WhatsApp chat, which doubles as the buyer's receipt. `Order.email` stays
on the model so you can note an address a buyer volunteers in the chat; it is
never used to contact them.

### Order links

There are no customer accounts. An order is reached at
`/order/<number>?token=<uuid>` and the token is what authorises access — order
numbers alone are short and guessable, so a request without the right token
returns 404 whether or not the order exists.

`/order/find` lists the orders placed from that browser, which it remembers
locally — there is no server-side lookup, because we hold nothing to match a
buyer against. A buyer on a new phone has their order number in the chat, so
that is where they ask.

The admin shows each order's full link (built from `SITE_URL`) ready to paste
into the conversation.

## Configuration

Backend `.env` (see `backend/.env.example`):

| Variable | Purpose |
|---|---|
| `WHATSAPP_NUMBER` | Digits with country code, e.g. `923001234567`. Empty hides every WhatsApp button. |
| `STORE_CURRENCY` | Currency prices are stored in. |
| `SITE_URL` | Public storefront URL. The order link the admin hands you is built from it — wrong value means dead links. |
| `THROTTLE_ORDER_CREATE` | Rate limit on order creation, default `20/hour`. |
| `META_PIXEL_ID` | Facebook pixel (dataset) id. Blank turns ads tracking off everywhere. |
| `META_CAPI_ACCESS_TOKEN` | Conversions API token, from Events Manager. Without it sales go unreported. |
| `META_TEST_EVENT_CODE` | Set while testing to divert events to the Test events tab. Clear it to go live. |
| `GA_MEASUREMENT_ID` | GA4 measurement id, `G-…`. Blank turns analytics off everywhere. |
| `GA_API_SECRET` | Measurement Protocol API secret, from the data stream. Without it sales go unreported. |
| `GA_DEBUG` | Set while testing: events are validated and discarded rather than recorded. Clear it to go live. |

Frontend `.env.local` needs `NEXT_PUBLIC_FACEBOOK_PIXEL_ID` and
`NEXT_PUBLIC_GA_MEASUREMENT_ID` set to the same ids as `META_PIXEL_ID` and
`GA_MEASUREMENT_ID`. Both are baked into the bundle at build time, so changing
either means rebuilding.

Payment instructions live in the admin under **Orders → Payment methods**.
Nothing on the storefront asks the buyer to pick one — you quote them in the
chat, and they appear on the order page once you set one on an order. The seeded ones contain placeholder account numbers — edit them before
taking real orders:

```bash
python manage.py seed_payment_methods
```

## Ads and analytics tracking

A sale here does not finish on the site, so neither the Facebook pixel nor
Google Analytics can see one. The buyer clicks into WhatsApp, pays in the chat,
and you confirm it by hand later. Both are split to match:

| What happens | Meta | Google | Reported by |
|---|---|---|---|
| A product page is opened | `ViewContent` | `view_item` | the browser |
| "Add to cart" | `AddToCart` | `add_to_cart` | the browser |
| "Buy now on WhatsApp" — the order is written and the chat opens | `Lead` | `generate_lead` | the browser |
| You mark the order completed in the admin | `Purchase` | `purchase` | the server |

**A click into WhatsApp is a lead, not a sale.** The money is only counted when
you complete the order, which is the one moment the store knows a sale actually
happened. Cancel an order instead and nothing is ever reported.

The server halves are the Conversions API (`backend/apps/orders/meta.py`) and
the Measurement Protocol (`backend/apps/orders/ga.py`). They matter because by
the time you confirm a sale the buyer is long gone: what makes a purchase
creditable is `_fbp`/`_fbc` and `_ga`, the cookies the two tags write, copied
onto the order when it was placed. Each network is told separately and stamps
its own column, so a retry only re-sends the half that never landed.

One difference between them is worth knowing. Meta's events carry an
`event_id`, so a `Lead` can safely be sent from the browser **and** the server
and still be counted once — which is how buyers running an ad blocker still
reach Events Manager. GA4 has no such key, so nothing is ever sent from both
sides, and a blocked tag is a lead Google never hears about. For the same
reason **never let Google Tag Manager fire Meta events**: a GTM copy would
carry a different `event_id` and every conversion would count twice. There is
no GTM here — gtag.js is loaded directly.

Page views are the one thing the store does not report to Google. GA4's
enhanced measurement already reports one on each History API change, which is
what an in-app navigation is, and a second from us would double them. If page
views ever stop arriving, check **Admin → Data streams → Enhanced measurement**
before looking at the code.

Nothing here can hold up a sale. Unconfigured, blocked by an ad blocker, or
rejected by Graph or Google, every event fails quietly — the failure lands in
`journalctl -u cheapgamespk-api` and the order goes through regardless. A
purchase that never arrived is left unstamped and can be retried with the
admin's **Send the purchase event again** action.

To check the wiring end to end, set `META_TEST_EVENT_CODE` from the Test events
tab in Events Manager and `GA_DEBUG=True`, place an order and complete it.
Meta's events appear in that tab and reach no live dataset; Google validates
its own and records nothing, complaining in the log if anything is malformed.

Google's half of that only proves the payload, though — a wrong measurement id
or a wrong API secret both come back clean, because the Measurement Protocol
never admits to a bad credential on any endpoint. The only thing that proves
those is clearing `GA_DEBUG` and watching **Reports → Realtime** for the event.

What the browser reports can be checked without either service:

```bash
NEXT_PUBLIC_FACEBOOK_PIXEL_ID=1234567890123456 npm run dev
npm run e2e:pixel

NEXT_PUBLIC_GA_MEASUREMENT_ID=G-TEST12345 npm run dev
npm run e2e:ga
```

## Deployment

Production runs on a single Ubuntu droplet: nginx out front, Next.js on `:3000`,
gunicorn on `:8000`, Postgres on `:5432`. Only nginx is reachable from outside,
and both apps answer on one origin — `/api` and `/admin` go to Django,
everything else to Next — which is why CORS is unused in production.

- **First-time provisioning:** [`deploy/SETUP.md`](deploy/SETUP.md)
- **Later updates:** `ssh cheapgamespk '/srv/cheapgamespk/deploy/deploy.sh'`

`DJANGO_DEBUG=False` is the single switch for production hardening — secure
cookies, HSTS, SSL redirect and the rest come on together, and startup aborts
if `DJANGO_SECRET_KEY` is still the dev default. The database is SQLite until
`DATABASE_URL` is set, so a fresh checkout runs with no configuration.

## Useful commands

```bash
python manage.py seed_demo             # demo catalog + credentials
python manage.py fetch_artwork         # pull cover art from Steam's CDN
python manage.py seed_payment_methods  # starter payment methods
```

Listings go up in batches rather than one admin form at a time. The batch
files live in `backend/batches/`, and each carries only what differs per game
— the activation steps and the limitations are written once per platform in
the command itself, so every EA listing words them the same way and so does
every Ubisoft one.

```bash
python manage.py import_products batches/ea-ubisoft.json --dry-run
python manage.py import_products batches/ea-ubisoft.json --no-artwork
python manage.py import_products batches/game-pass.json
```

Full-access accounts — the account itself, fresh and unplayed, sold outright —
are the same file format with `"product_type": "online_account"` on them. That
is what swaps the offline wording for the full-access wording on the same
platform, so a Steam listing tells its buyer to change the password now and the
email in a month rather than to stay in Offline Mode.

Game Pass listings are the same idea one step further. Each one sells the same
Microsoft Store account with a 12-month subscription on it, and only the game a
buyer came in looking for changes, so a batch entry carries the game and
nothing else: `"platform": "Xbox Game Pass"` is what makes it an online account
with the subscription's activation steps and limitations on it. What the
subscription includes, and the titles it does not cover, are on the storefront
in `frontend/src/components/GamePassTerms.tsx` — the Game Pass library rotates,
so it is worth a look before a batch of them goes up.

`--no-artwork` leaves the covers empty for uploading by hand in the admin.
Without it the command looks the game up on Steam's CDN, by `appid` if the
batch names one and by a fuzzy title search if it does not — and that search
happily returns MK11 for "Mortal Kombat 1". Re-running is safe: a name already
in the catalog is left alone unless `--update` is passed.

Staff passwords are reset with `python manage.py changepassword <user>`. The
admin's "forgot password" flow needs SMTP and there is none, so that is the
only way in if you lock yourself out.

```bash
npm run shot           # screenshot desktop + mobile
npm run lint
npm run build
```
