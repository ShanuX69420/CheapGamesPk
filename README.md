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
   "Deliver — release credentials to the buyer".
4. **Credentials appear** on the buyer's order page, if you attached a unit to
   the order line. Until delivery the API returns `null` for them, whatever
   the URL says.

Nothing is reserved and nothing runs out. What we sell is an offline
activation that can be handed out repeatedly, so every active listing is
always sellable and fulfilment is manual. Stock items are a credential
library for staff, not a pool that orders draw down — hide a listing with
`is_active` if you need it off the shelf.

Emails are opt-in by accident of the flow: a WhatsApp order carries no address,
so nothing is sent unless you put one on the order in the admin. Once an order
has an email, a confirmation goes out at step 1 and a "ready" email at step 3.
Both link to the order page rather than pasting account details into the
message; set `ORDER_EMAIL_INCLUDE_CREDENTIALS=True` if you would rather inline
them, knowing that puts credentials in an inbox you cannot revoke.

### Order links

There are no customer accounts. An order is reached at
`/order/<number>?token=<uuid>` and the token is what authorises access — order
numbers alone are short and guessable, so a request without the right token
returns 404 whether or not the order exists.

Buyers who lose the link can request it at `/order/find`. That endpoint answers
identically whether or not the address has orders, so it cannot be used to test
which emails are customers, and it is rate limited.

## Configuration

Backend `.env` (see `backend/.env.example`):

| Variable | Purpose |
|---|---|
| `WHATSAPP_NUMBER` | Digits with country code, e.g. `923001234567`. Empty hides every WhatsApp button. |
| `STORE_CURRENCY` | Currency prices are stored in. |
| `SITE_URL` | Public storefront URL. Order links in emails are built from it — wrong value means dead links. |
| `EMAIL_HOST` etc. | SMTP settings. **Leave blank and mail prints to the console instead of sending.** |
| `DEFAULT_FROM_EMAIL` | From address on order emails. |
| `ORDER_EMAIL_INCLUDE_CREDENTIALS` | `True` also pastes account details into the email body. Off by default. |
| `THROTTLE_ORDER_CREATE` | Rate limit on order creation, default `20/hour`. |
| `THROTTLE_ORDER_RECOVER` | Rate limit on recovery emails, default `5/hour`. |

Payment instructions live in the admin under **Orders → Payment methods**.
Nothing on the storefront asks the buyer to pick one — you quote them in the
chat, and they appear on the order page and in emails once you set one on an
order. The seeded ones contain placeholder account numbers — edit them before
taking real orders:

```bash
python manage.py seed_payment_methods
```

## Useful commands

```bash
python manage.py seed_demo             # demo catalog + credentials
python manage.py fetch_artwork         # pull cover art from Steam's CDN
python manage.py seed_payment_methods  # starter payment methods
python manage.py send_test_email you@example.com --kind delivered
```

`send_test_email` renders a real order through the real sending path — use it
to confirm SMTP works before taking live orders.

```bash
npm run shot           # screenshot desktop + mobile
npm run lint
npm run build
```
