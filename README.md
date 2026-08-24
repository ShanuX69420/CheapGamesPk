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
   — see [Ads tracking](#ads-tracking).

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

Frontend `.env.local` needs `NEXT_PUBLIC_FACEBOOK_PIXEL_ID` set to the same id
as `META_PIXEL_ID`. It is baked into the bundle at build time, so changing it
means rebuilding.

Payment instructions live in the admin under **Orders → Payment methods**.
Nothing on the storefront asks the buyer to pick one — you quote them in the
chat, and they appear on the order page once you set one on an order. The seeded ones contain placeholder account numbers — edit them before
taking real orders:

```bash
python manage.py seed_payment_methods
```

## Ads tracking

A sale here does not finish on the site, so the Facebook pixel cannot see one.
The buyer clicks into WhatsApp, pays in the chat, and you confirm it by hand
later. Tracking is split to match:

| What happens | Event | Reported by |
|---|---|---|
| A product page is opened | `ViewContent` | the browser |
| "Add to cart" | `AddToCart` | the browser |
| "Buy now on WhatsApp" — the order is written and the chat opens | `Lead` | the browser **and** the server |
| You mark the order completed in the admin | `Purchase` | the server |

**A click into WhatsApp is a lead, not a sale.** The money is only counted when
you complete the order, which is the one moment the store knows a sale actually
happened. Cancel an order instead and nothing is ever reported.

The server half is the Conversions API (`backend/apps/orders/meta.py`). It
matters because by the time you confirm a sale the buyer is long gone: what
makes the Purchase creditable to an ad is `_fbp`/`_fbc`, the pixel's cookies,
copied onto the order when it was placed. Events carry an `event_id`, so the
two copies of a `Lead` are counted once.

Nothing here can hold up a sale. Unconfigured, blocked by an ad blocker, or
rejected by Graph, every event fails quietly — the failure lands in
`journalctl -u cheapgamespk-api` and the order goes through regardless. A
Purchase that never arrived is stamped as unsent and can be retried with the
admin's **Send the Purchase event to Meta** action.

To check the wiring end to end, set `META_TEST_EVENT_CODE` from the Test events
tab in Events Manager, place an order and complete it. Both events should
appear there, and neither reaches the live dataset. What the browser reports
can be checked without Meta at all:

```bash
NEXT_PUBLIC_FACEBOOK_PIXEL_ID=1234567890123456 npm run dev
npm run e2e:pixel
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

Staff passwords are reset with `python manage.py changepassword <user>`. The
admin's "forgot password" flow needs SMTP and there is none, so that is the
only way in if you lock yourself out.

```bash
npm run shot           # screenshot desktop + mobile
npm run lint
npm run build
```
