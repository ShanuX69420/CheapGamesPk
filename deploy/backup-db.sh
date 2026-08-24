#!/usr/bin/env bash
# Nightly Postgres dump, 14 days kept. Wire up with:
#   sudo crontab -e
#   15 3 * * * /srv/cheapgamespk/deploy/backup-db.sh
#
# This is on the same disk as the database, so it survives a bad migration but
# not a dead droplet — that is what DO's droplet backups are for. Pull a copy
# down now and then too.
set -euo pipefail

BACKUP_DIR=/var/backups/cheapgamespk
mkdir -p "$BACKUP_DIR"
STAMP=$(date +%Y-%m-%d)

sudo -u postgres pg_dump --clean --if-exists cheapgamespk \
    | gzip > "$BACKUP_DIR/cheapgamespk-$STAMP.sql.gz"

find "$BACKUP_DIR" -name 'cheapgamespk-*.sql.gz' -mtime +14 -delete
