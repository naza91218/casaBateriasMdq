# API y worker de La Casa de las Baterías (T125). Se construye desde la raíz del monorepo:
#   docker build -f backend/Dockerfile -t casa-backend .
# La misma imagen corre la API (por defecto) o el worker:
#   docker run casa-backend                         → API en el puerto 4000
#   docker run casa-backend node dist/worker/main.js → worker (outbox: mails y revalidaciones)
#   docker run casa-backend node dist/platform/migrar.js  → migraciones
#   docker run casa-backend node dist/platform/sembrar.js → datos mínimos (marcas, medidas, admin)

FROM node:24-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /app

# --- Compilación ---------------------------------------------------------------------------
FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter backend...
COPY shared shared
COPY backend backend
RUN pnpm --filter backend build

# --- Dependencias de producción ------------------------------------------------------------
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod --filter backend...

# --- Imagen final --------------------------------------------------------------------------
FROM node:24-slim
ENV NODE_ENV=production
WORKDIR /app
# @casa/shared se usa como TypeScript: Node 24 le saca los tipos al cargarlo, pero solo fuera de
# node_modules. Por eso va como carpeta del workspace (node_modules/@casa/shared es un enlace).
COPY --from=deps --chown=node:node /app/node_modules node_modules
COPY --from=deps --chown=node:node /app/shared/node_modules shared/node_modules
COPY --from=deps --chown=node:node /app/backend/node_modules backend/node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node shared/package.json shared/
COPY --chown=node:node shared/src shared/src
COPY --chown=node:node backend/package.json backend/
COPY --chown=node:node backend/db/migrations backend/db/migrations
COPY --from=build --chown=node:node /app/backend/dist backend/dist

WORKDIR /app/backend
# Sin R2 las fotos van a esta carpeta: en el servidor se monta un volumen.
RUN mkdir -p uploads && chown node:node uploads
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/v1/salud').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "dist/main.js"]
