# Provisioning cheapgames.pk

One-time setup for a fresh Ubuntu 24.04 droplet. Run once; after this, updates
are just `deploy/deploy.sh`.

Everything lives on one box: nginx out front, Next.js on :3000, gunicorn on
:8000, Postgres on :5432. Only nginx is reachable from outside.

Target: `167.99.72.162` → `cheapgames.pk`

---

## 0. Before you start

- SSH key installed on the droplet (`ssh root@167.99.72.162` works)
- Cloudflare A records for `@` and `www` → `167.99.72.162`, **grey cloud
  (DNS only)**. Let's Encrypt has to reach the origin directly to issue the
  certificate; we turn the orange cloud on at step 9.

## 1. Swap

2 GB of RAM is enough to *run* this and not quite enough to *build* it —
`next build` will get OOM-killed without swap.

```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile
mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
sysctl -w vm.swappiness=10 && echo 'vm.swappiness=10' >> /etc/sysctl.conf
```

## 2. Packages

```bash
apt update && apt upgrade -y
apt install -y python3-venv python3-pip postgresql postgresql-contrib \
               nginx git curl ufw certbot python3-certbot-nginx

curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
node --version   # expect v22.x — Next 16 needs >= 20.9
```

## 3. Firewall

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
```

Postgres and both app servers bind to `127.0.0.1` only, so they are never
exposed regardless.

## 4. App user

The apps run as a non-root user that owns nothing but its own tree.

```bash
adduser --system --group --home /srv/cheapgamespk --shell /bin/bash cheapgamespk
```

## 5. Postgres

```bash
sudo -u postgres psql <<'SQL'
CREATE USER cheapgamespk WITH PASSWORD 'PUT_A_REAL_PASSWORD_HERE';
CREATE DATABASE cheapgamespk OWNER cheapgamespk;
ALTER ROLE cheapgamespk SET client_encoding TO 'utf8';
ALTER ROLE cheapgamespk SET default_transaction_isolation TO 'read committed';
ALTER ROLE cheapgamespk SET timezone TO 'Asia/Karachi';
SQL
```

Generate the password with `openssl rand -base64 24` and keep it — it goes in
`DATABASE_URL` next.

## 6. Code

```bash
git clone https://github.com/ShanuX69420/CheapGamesPk.git /srv/cheapgamespk
chown -R cheapgamespk:cheapgamespk /srv/cheapgamespk
```

### Backend

```bash
sudo -u cheapgamespk bash
cd /srv/cheapgamespk/backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

Write `/srv/cheapgamespk/backend/.env` — **`DJANGO_DEBUG=False` is the flag
that switches on every security setting at once**:

```ini
DJANGO_SECRET_KEY=<python3 -c "import secrets;print(secrets.token_urlsafe(64))">
DJANGO_DEBUG=False
# 127.0.0.1 is required: server-side renders reach gunicorn on loopback and
# Django checks the Host header on those too.
DJANGO_ALLOWED_HOSTS=cheapgames.pk,www.cheapgames.pk,167.99.72.162,127.0.0.1
DJANGO_TIME_ZONE=Asia/Karachi

DATABASE_URL=postgres://cheapgamespk:THE_PASSWORD@127.0.0.1:5432/cheapgamespk

# Frontend and API share one origin behind nginx, so CORS is not needed.
CORS_ALLOWED_ORIGINS=
CSRF_TRUSTED_ORIGINS=https://cheapgames.pk,https://www.cheapgames.pk

STORE_CURRENCY=PKR
WHATSAPP_NUMBER=923252155276
SITE_URL=https://cheapgames.pk

# nginx already redirects http->https. Leaving Django to do it as well breaks
# server-side rendering — Next fetches the API over plain http on loopback and
# would get a 301 instead of JSON.
SECURE_SSL_REDIRECT=False

CATALOG_PAGE_SIZE=24
THROTTLE_ORDER_CREATE=20/hour
```

```bash
chmod 600 .env
.venv/bin/python manage.py migrate
.venv/bin/python manage.py collectstatic --noinput
.venv/bin/python manage.py check --deploy     # must report 0 issues
.venv/bin/python manage.py createsuperuser
.venv/bin/python manage.py seed_payment_methods
```

Do **not** run `seed_demo` — that is the fake catalog.

### Frontend

`/srv/cheapgamespk/frontend/.env.local`:

```ini
# What the browser calls. Same origin as the page, so no CORS.
NEXT_PUBLIC_API_URL=https://cheapgames.pk/api
# What a server render calls — straight to gunicorn, skipping nginx.
INTERNAL_API_URL=http://127.0.0.1:8000/api
NEXT_PUBLIC_STORE_CURRENCY=PKR
```

`NEXT_PUBLIC_*` values are baked into the bundle at build time, so this file has
to be right **before** `npm run build`, and changing it later means rebuilding.

```bash
cd /srv/cheapgamespk/frontend
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci
npm run build
exit    # back to root
```

## 7. Services

```bash
cp /srv/cheapgamespk/deploy/cheapgamespk-api.service /etc/systemd/system/
cp /srv/cheapgamespk/deploy/cheapgamespk-web.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now cheapgamespk-api cheapgamespk-web
systemctl status cheapgamespk-api cheapgamespk-web --no-pager
```

Logs are `journalctl -u cheapgamespk-api -f`.

Let the app user restart its own services without a password, so `deploy.sh`
works unattended:

```bash
cat > /etc/sudoers.d/cheapgamespk <<'EOF'
cheapgamespk ALL=(root) NOPASSWD: /usr/bin/systemctl restart cheapgamespk-api cheapgamespk-web
EOF
chmod 440 /etc/sudoers.d/cheapgamespk
```

## 8. nginx

```bash
mkdir -p /etc/nginx/snippets
cp /srv/cheapgamespk/deploy/cheapgamespk-proxy.conf /etc/nginx/snippets/
cp /srv/cheapgamespk/deploy/nginx.conf /etc/nginx/sites-available/cheapgamespk
ln -sf /etc/nginx/sites-available/cheapgamespk /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

Check `http://cheapgames.pk` now serves the store over plain HTTP before going
further. If it does not, fix it here — TLS on top of a broken proxy is harder
to debug.

## 9. TLS, then Cloudflare

```bash
certbot --nginx -d cheapgames.pk -d www.cheapgames.pk
```

Certbot rewrites the site config with the `:443` block and the redirect, and
installs a renewal timer. Confirm with `certbot renew --dry-run`.

**Now** flip both Cloudflare A records to orange (Proxied), and set
**SSL/TLS → Overview → Full (strict)**. Any other mode either breaks
(`Flexible` gives a redirect loop against `SECURE_SSL_REDIRECT`) or skips
verifying the origin certificate.

## 10. Backups

```bash
cp /srv/cheapgamespk/deploy/backup-db.sh /srv/cheapgamespk/deploy/
crontab -e
# 15 3 * * * /srv/cheapgamespk/deploy/backup-db.sh
```

Also switch on DO's droplet backups in the panel — the cron dump is on the same
disk as the database it is backing up.

## 11. Smoke test

- `https://cheapgames.pk` — catalog loads, artwork renders
- A product page — "Buy now on WhatsApp" opens a chat to **+92 325 2155276**
- Cart → WhatsApp with several games in one message
- `https://cheapgames.pk/admin/` — login works and **the CSS loads** (unstyled
  admin means whitenoise/collectstatic did not run)
- `curl -I http://cheapgames.pk` → 301 to https

Then add your real products in the admin and you are live.

---

## Updating later

```bash
ssh cheapgamespk 'sudo -u cheapgamespk /srv/cheapgamespk/deploy/deploy.sh'
```
