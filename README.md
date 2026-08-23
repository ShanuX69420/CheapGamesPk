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
