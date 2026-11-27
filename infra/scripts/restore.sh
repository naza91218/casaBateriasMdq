#!/usr/bin/env bash
# Restaura una copia de R2 sobre la base de un entorno (T130). REEMPLAZA los datos actuales.
#   infra/scripts/restore.sh produccion                       → la copia más reciente
#   infra/scripts/restore.sh staging casa-produccion-20261104-0415.sql.gz   → una en particular
# (restaurar la de producción en staging es la forma de probar las copias sin riesgo)
set -euo pipefail

ENTORNO=${1:?Uso: restore.sh <staging|produccion> [archivo]}
ORIGEN=${ORIGEN:-produccion}
BUCKET=${R2_BACKUP_BUCKET:-casa-backups}
DIR=/srv/casa/$ENTORNO
ARCHIVO=${2:-$(rclone lsf "r2:$BUCKET/$ORIGEN/" | sort | tail -1)}
[ -n "$ARCHIVO" ] || { echo "No hay copias en r2:$BUCKET/$ORIGEN/"; exit 1; }

read -r -p "Se reemplaza la base de $ENTORNO con $ARCHIVO. Escribí el entorno para seguir: " OK
[ "$OK" = "$ENTORNO" ] || { echo "Cancelado"; exit 1; }

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
rclone copy "r2:$BUCKET/$ORIGEN/$ARCHIVO" "$TMP/"

cd "$DIR"
export TAG=$(cat .tag-actual)
docker compose --env-file .env stop backend worker
gunzip -c "$TMP/$ARCHIVO" | docker compose --env-file .env exec -T db psql -U casa -d casa -v ON_ERROR_STOP=1 -q
docker compose --env-file .env run --rm --no-deps backend node dist/platform/migrar.js
docker compose --env-file .env start backend worker
echo "✓ $ENTORNO restaurado desde $ARCHIVO"
