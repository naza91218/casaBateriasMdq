#!/usr/bin/env bash
# Despliega una versión en un entorno (T128). Lo corre GitHub Actions por SSH, o a mano:
#   infra/scripts/deploy.sh staging <tag>
#   infra/scripts/deploy.sh produccion <tag>
#   infra/scripts/deploy.sh produccion --rollback      → vuelve a la versión anterior
#
# Pasos: baja las imágenes, corre las migraciones con la imagen nueva (si fallan, aborta y deja
# todo como estaba), aplica los datos mínimos, cambia los contenedores y espera a que /salud
# responda. Si no responde, vuelve a la etiqueta anterior.
set -euo pipefail

ENTORNO=${1:?Uso: deploy.sh <staging|produccion> <tag|--rollback>}
TAG_NUEVO=${2:?Falta la etiqueta}
DIR=/srv/casa/$ENTORNO
cd "$DIR"

ACTUAL=$(cat .tag-actual 2>/dev/null || true)
if [ "$TAG_NUEVO" = "--rollback" ]; then
  TAG_NUEVO=$(cat .tag-anterior 2>/dev/null) || { echo "No hay versión anterior"; exit 1; }
fi

compose() { TAG=$1 docker compose --env-file .env "${@:2}"; }
PUERTO_API=$(grep -E '^PUERTO_API=' .env | cut -d= -f2)

echo "→ $ENTORNO: ${ACTUAL:-(nada)} → $TAG_NUEVO"
compose "$TAG_NUEVO" pull backend worker frontend
compose "$TAG_NUEVO" up -d db

# Migraciones antes de tocar los contenedores que atienden. Son compatibles hacia atrás, así que
# la versión vieja sigue andando con la base ya migrada mientras se hace el cambio.
if ! compose "$TAG_NUEVO" run --rm --no-deps backend node dist/platform/migrar.js; then
  echo "✗ Fallaron las migraciones: no se cambió nada"
  exit 1
fi
compose "$TAG_NUEVO" run --rm --no-deps backend node dist/platform/sembrar.js

compose "$TAG_NUEVO" up -d --remove-orphans backend worker frontend

for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:$PUERTO_API/api/v1/salud" >/dev/null; then
    [ -n "$ACTUAL" ] && [ "$ACTUAL" != "$TAG_NUEVO" ] && echo "$ACTUAL" > .tag-anterior
    echo "$TAG_NUEVO" > .tag-actual
    docker image prune -f >/dev/null
    echo "✓ $ENTORNO en $TAG_NUEVO"
    exit 0
  fi
  sleep 2
done

echo "✗ /salud no respondió en 60 s"
if [ -n "$ACTUAL" ]; then
  echo "→ Volviendo a $ACTUAL"
  compose "$ACTUAL" up -d backend worker frontend
fi
exit 1
