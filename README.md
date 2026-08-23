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

Both checkout paths create the same `Order` and reserve the same stock — they
differ only in how the buyer pays.

1. **Buyer orders** — website checkout, or "Buy now on WhatsApp" which creates
   the order first and then opens a chat pre-filled with the order number.
2. **Stock is reserved.** Units move `available -> reserved` and are attached to
   the order line. If any line cannot be filled the whole order rolls back, so
   an order is never partially stocked.
3. **Buyer pays** using the instructions on their order page (JazzCash,
   EasyPaisa, bank transfer, crypto — all editable in the admin).
4. **You confirm** in Django admin: select the order, "Mark as paid", then
   "Deliver — release credentials to the buyer".
5. **Credentials appear** on the buyer's order page. Until delivery the API
   returns `null` for them, whatever the URL says.

Unpaid orders release their stock automatically after `ORDER_HOLD_MINUTES`
(default 120). Run the sweep from the admin ("Expire stale holds") or on a
schedule:

```python
from apps.orders.models import expire_stale_orders
expire_stale_orders()
```

### Order links

There are no customer accounts. An order is reached at
`/order/<number>?token=<uuid>` and the token is what authorises access — order
numbers alone are short and guessable, so a request without the right token
returns 404 whether or not the order exists.

## Configuration

Backend `.env` (see `backend/.env.example`):

| Variable | Purpose |
|---|---|
| `WHATSAPP_NUMBER` | Digits with country code, e.g. `923001234567`. Empty hides every WhatsApp button. |
| `ORDER_HOLD_MINUTES` | How long an unpaid order holds stock. |
| `STORE_CURRENCY` | Currency prices are stored in. |

Payment instructions live in the admin under **Orders → Payment methods**. The
seeded ones contain placeholder account numbers — edit them before taking real
orders:

```bash
python manage.py seed_payment_methods
```

## Useful commands

```bash
python manage.py seed_demo             # demo catalog + stock
python manage.py fetch_artwork         # pull cover art from Steam's CDN
python manage.py seed_payment_methods  # starter payment methods
```

```bash
npm run shot           # screenshot desktop + mobile
npm run lint
npm run build
```
