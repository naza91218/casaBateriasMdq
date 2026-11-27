# Tienda y panel (T135). Se construye desde la raíz del monorepo:
#   docker build -f frontend/Dockerfile -t casa-frontend \
#     --build-arg NEXT_PUBLIC_SITIO_URL=https://casadelasbaterias.com.ar .
# Las NEXT_PUBLIC_* quedan fijas en el build (van al navegador); API_INTERNAL_URL y
# REVALIDATE_SECRET se pasan al correr el contenedor.

FROM node:24-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /app

# --- Compilación ---------------------------------------------------------------------------
FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY shared/package.json shared/
COPY frontend/package.json frontend/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter frontend...
COPY shared shared
COPY frontend frontend
ARG NEXT_PUBLIC_SITIO_URL
ARG NEXT_PUBLIC_GA4_ID=
ARG NEXT_PUBLIC_META_PIXEL_ID=
ENV NEXT_PUBLIC_SITIO_URL=$NEXT_PUBLIC_SITIO_URL \
    NEXT_PUBLIC_GA4_ID=$NEXT_PUBLIC_GA4_ID \
    NEXT_PUBLIC_META_PIXEL_ID=$NEXT_PUBLIC_META_PIXEL_ID
# Sin la API a mano, las páginas con datos salen vacías y se regeneran en el primer pedido.
RUN pnpm --filter frontend build

# --- Imagen final --------------------------------------------------------------------------
FROM node:24-slim
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /app/frontend/.next/standalone ./
COPY --from=build --chown=node:node /app/frontend/.next/static frontend/.next/static
COPY --from=build --chown=node:node /app/frontend/public frontend/public
WORKDIR /app/frontend
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/robots.txt').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "server.js"]
