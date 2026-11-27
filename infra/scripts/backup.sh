#!/usr/bin/env bash
# Copia diaria de la base a Cloudflare R2 (T130). Cron del VPS (usuario deploy):
#   15 4 * * * /srv/casa/scripts/backup.sh produccion >> /var/log/casa-backup.log 2>&1
# Necesita rclone con un remoto "r2" (ver infra/README.md) y el bucket en R2_BACKUP_BUCKET.
# Las copias de más de 30 días se borran.
set -euo pipefail

ENTORNO=${1:-produccion}
DIR=/srv/casa/$ENTORNO
BUCKET=${R2_BACKUP_BUCKET:-casa-backups}
ARCHIVO=casa-$ENTORNO-$(date -u +%Y%m%d-%H%M).sql.gz
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

cd "$DIR"
export TAG=$(cat .tag-actual)
docker compose --env-file .env exec -T db pg_dump -U casa -d casa --no-owner --clean --if-exists \
  | gzip -9 > "$TMP/$ARCHIVO"

# Una copia vacía es peor que ninguna: se corta antes de subirla.
[ "$(stat -c%s "$TMP/$ARCHIVO")" -gt 1024 ] || { echo "✗ Copia sospechosamente chica"; exit 1; }

rclone copy "$TMP/$ARCHIVO" "r2:$BUCKET/$ENTORNO/"
rclone delete --min-age 30d "r2:$BUCKET/$ENTORNO/"
echo "✓ $(date -u +%FT%TZ) $ARCHIVO"
