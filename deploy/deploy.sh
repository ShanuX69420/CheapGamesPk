#!/usr/bin/env bash
# Update a running cheapgamespk server to the latest main.
#
#   ssh cheapgamespk 'sudo -u cheapgamespk /srv/cheapgamespk/deploy/deploy.sh'
#
# Safe to re-run. Does not touch the database beyond applying migrations.
set -euo pipefail

APP_DIR=/srv/cheapgamespk
cd "$APP_DIR"

echo "==> Pulling"
git pull --ff-only

echo "==> Backend"
cd "$APP_DIR/backend"
.venv/bin/pip install -q -r requirements.txt
.venv/bin/python manage.py migrate --noinput
.venv/bin/python manage.py collectstatic --noinput
# Refuses to start rather than serving a broken config.
.venv/bin/python manage.py check --deploy --fail-level WARNING

echo "==> Frontend"
cd "$APP_DIR/frontend"
# Next needs the devDependencies (typescript, tailwind) to build, so this is
# a full install. Playwright is in there too and would otherwise pull ~300MB
# of browsers the server has no use for.
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci
npm run build

echo "==> Restarting"
sudo systemctl restart cheapgamespk-api cheapgamespk-web
sleep 3
systemctl is-active --quiet cheapgamespk-api || { echo "API failed to start"; journalctl -u cheapgamespk-api -n 30 --no-pager; exit 1; }
systemctl is-active --quiet cheapgamespk-web || { echo "Web failed to start"; journalctl -u cheapgamespk-web -n 30 --no-pager; exit 1; }

echo "==> Done"
