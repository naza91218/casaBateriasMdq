# Research: Tienda online de La Casa de las Baterías

**Feature**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Fecha**: 2026-10-29

Cada decisión resuelve un punto abierto del contexto técnico. Formato: decisión, por qué,
alternativas descartadas.

## R1. Estructura del repositorio

- **Decisión:** monorepo con **pnpm workspaces**: `backend/`, `frontend/`, `shared/`,
  `tools/scraper/`, `infra/`.
- **Por qué:** la constitución pide separar frontend y backend (opción A, API propia), pero los
  contratos Zod tienen que ser los mismos de los dos lados. Un monorepo comparte `shared/` sin
  publicar paquetes, y un solo CI corre todo.
- **Alternativas:** dos repos (contratos duplicados o publicados en npm: más fricción para 1 dev);
  npm workspaces (funciona, pero pnpm es más rápido e instala menos en el VPS y en CI).

## R2. Framework del backend

- **Decisión:** **Fastify 5** + TypeScript estricto, Node.js **24 LTS**, con
  `fastify-type-provider-zod` y `@fastify/swagger` para generar la documentación OpenAPI desde
  los mismos esquemas Zod.
- **Por qué:** rápido, liviano en memoria (importa en un VPS de 2–4 GB), validación y
  serialización por esquema, plugins oficiales para cookies, multipart, rate limit y CORS.
  Encaja con puertos y adaptadores: las rutas son una capa delgada que llama a casos de uso.
- **Alternativas:** NestJS (más estructura, pero más pesado y con más ceremonia de la que pide un
  proyecto de 30 días); Express (sin validación por esquema ni tipado de fábrica); Hono (muy
  bueno, pero menos plugins maduros para multipart y sesiones en Node).

## R3. Base de datos y acceso a datos

- **Decisión:** **PostgreSQL 17** en el VPS (contenedor Docker con volumen) + **Drizzle ORM** y
  `drizzle-kit` para migraciones versionadas en SQL. Un esquema de Drizzle por módulo.
- **Por qué:** transacciones reales para la reserva de stock (`UPDATE … WHERE stock >= n`),
  `SELECT … FOR UPDATE SKIP LOCKED` para el worker, restricciones `UNIQUE` para idempotencia.
  Drizzle deja el SQL explícito y es liviano.
- **Alternativas:** Neon (descartado el 29/10: el VPS ya se paga y evita otra cuenta y límites de
  plan gratuito); Prisma (motor aparte, más memoria, SQL menos explícito para el UPDATE
  condicional); MySQL (sin `SKIP LOCKED` tan cómodo y el equipo ya conoce Postgres).

## R4. Ingreso al panel

- **Decisión:** **enlace mágico propio en el backend**: token aleatorio de 32 bytes, se guarda
  solo su hash (SHA-256), vence a los 15 minutos y se usa una vez. Al verificarlo se crea una
  **sesión opaca** en la base y una cookie `httpOnly`, `Secure`, `SameSite=Lax`, de 30 días. Rate
  limit en el pedido de enlace. La respuesta es idéntica para mails autorizados y no
  autorizados.
- **Por qué:** con la API separada, el login vive en el backend. Auth.js está pensado para Next.js
  y no aporta sobre un caso de un solo usuario. Sesiones en base permiten cerrarlas y sumar roles
  después (FR-042).
- **Alternativas:** Auth.js en el frontend (mezcla el login con la UI y obliga a compartir la base
  con Next.js, prohibido por la constitución); JWT sin estado (no se pueden revocar).
- **Impacto:** la constitución nombraba Auth.js; se actualiza a v1.4.0 (ver plan, Complexity
  Tracking).

## R5. Mercado Pago

- **Decisión:** **Checkout Pro** con el SDK oficial `mercadopago` (v2). La preferencia se crea con
  `external_reference = pedido.id`, `notification_url` al webhook, `expires = true` con
  `expiration_date_to = creado + 30 min`, y `payment_methods.excluded_payment_types =
  [ticket, atm]` para dejar solo medios instantáneos (tarjetas y dinero en cuenta).
  - **Webhook:** se valida la firma `x-signature` (HMAC-SHA256 con la clave secreta del webhook
    sobre `id`, `request-id` y `ts`); después se **consulta el pago** a `GET /v1/payments/{id}` y
    recién ahí se decide. Respuesta 200 rápida; el procesamiento es idempotente por
    `(proveedor, id_externo)` con restricción `UNIQUE`.
  - **Reglas:** `approved` y monto igual al total → `pagado`. Monto distinto o pedido cancelado →
    alerta. `rejected` → sigue pendiente, se puede reintentar.
- **Por qué:** cumple FR-024, FR-025, FR-031 y FR-034b sin manejar datos de tarjeta.
- **Alternativas:** Checkout API/Bricks (más trabajo de UI y de PCI, sin beneficio para el
  alcance); confiar en el `back_url` (prohibido por la constitución).

## R6. Mails y trabajos en segundo plano

- **Decisión:** **outbox transaccional propio** (tabla `outbox_mensajes`) + **worker** en un
  proceso aparte (mismo código del backend, otra entrada). El worker toma mensajes con
  `FOR UPDATE SKIP LOCKED`, los envía con **Resend** y reintenta con espera exponencial (1, 5,
  15, 60 min; hasta 8 intentos). Clave única `(evento, pedido_id, destinatario)` para no enviar
  dos veces. Plantillas con **React Email** renderizadas en el backend.
  - **Vencimientos:** el mismo worker corre cada minuto la cancelación de pedidos vencidos (30 min
    Mercado Pago, 48 h transferencia), en transacción con la devolución de stock.
- **Por qué:** FR-040 (un mail que falla no frena el pedido y sale una sola vez) sin sumar
  infraestructura (Redis, colas). Postgres alcanza para el volumen.
- **Alternativas:** pg-boss (buena opción si crece; hoy es una dependencia más para dos tareas);
  BullMQ (necesita Redis); cron del sistema (no reintenta ni es transaccional).

## R7. Frontend (bloque posterior)

- **Decisión:** **Next.js 16** (App Router) + Tailwind CSS; shadcn/ui solo en el panel. Las
  páginas públicas se renderizan en el servidor e ISR con etiquetas; el backend avisa cambios a
  `POST /api/revalidate` del frontend con un secreto compartido. El frontend llama a la API desde
  el servidor por la red interna de Docker (`http://backend:4000`); el navegador llama a
  `/api/v1` del mismo dominio (Nginx) para checkout y panel.
- **Por qué:** SEO y GEO (FR-053, FR-072) necesitan HTML completo sin JavaScript; mismo origen =
  sin CORS y cookie de sesión simple.
- **Pendiente:** el diseño UX/UI no está cerrado; este bloque se planifica en detalle cuando el
  usuario lo defina. `DESIGN.md` queda como referencia.

## R8. Fotos

- **Decisión:** **Cloudflare R2** (API S3, `@aws-sdk/client-s3`), un bucket por entorno, servido
  por un subdominio público (`img.<dominio>`). Al subir, el backend normaliza con **sharp** (WebP,
  máx. 1600 px, sin metadatos EXIF) y guarda la clave en la base. En desarrollo, adaptador a disco
  local.
- **Por qué:** sin costo de salida, fuera del VPS (no ocupa disco ni backups), y el puerto
  `Almacenamiento` permite cambiarlo.
- **Alternativas:** disco del VPS (más simple, pero suma peso a los backups y al disco).

## R9. Cifrado y datos personales

- **Decisión:** DNI cifrado con **AES-256-GCM** (`node:crypto`), IV aleatorio por registro,
  clave de 32 bytes por variable de entorno con **versión de clave** guardada junto al dato para
  poder rotarla. Logger **pino** con `redact` para `dni`, `direccion`, `telefono`, `email`,
  `nombre`; Sentry con `beforeSend` que elimina cuerpos de request.
- **Por qué:** FR-059 y principio VI.
- **Alternativas:** `pgcrypto` en la base (la clave viajaría en las consultas y quedaría en logs
  de Postgres).

## R10. Importación y scraper

- **Decisión:**
  - **Importación (backend):** CSV UTF-8 con encabezados fijos (ver
    [contracts/importacion-csv.md](contracts/importacion-csv.md)), parser `csv-parse`, validación
    Zod fila por fila, upsert por SKU (productos) o por `(marca, modelo, año_desde, año_hasta,
    motor)` (vehículos). Informe por fila. Productos nuevos entran `a_revisar`.
  - **Scraper (`tools/scraper/`):** script aparte con Playwright (sitios con JavaScript) o
    fetch + cheerio (HTML simple). Respeta `robots.txt`, 1 pedido cada 2 s, identifica el
    User-Agent. Solo genera los CSV y descarga fotos a `data/import/fotos/`; nunca escribe en la
    base. No toma precios.
  - **Fuentes iniciales:** herbobaterias.com (catálogo y compatibilidad), lista Sermat/Volta de
    distribuidores, Edna a mano.
- **Por qué:** capa anticorrupción: si un sitio cambia, se arregla el scraper sin tocar la app; el
  administrador revisa todo (FR-070).

## R11. Docker y entornos

- **Decisión:**
  - **Desarrollo:** `infra/docker-compose.dev.yml` con PostgreSQL 17 y Mailpit. Backend y
    frontend corren con `pnpm dev` en la máquina (recarga al instante).
  - **Staging y producción:** `infra/docker-compose.yml` con servicios `backend`, `worker`,
    `frontend` y `db`; un proyecto de Compose por entorno (`-p staging`, `-p prod`) con su
    archivo `.env`. Imágenes multi-stage (Node 24 slim), usuario no root.
  - **Nginx** instalado en el VPS como proxy: `dominio` → frontend; `dominio/api` → backend;
    `staging.dominio` con autenticación básica y `X-Robots-Tag: noindex`. HTTPS con certbot.
  - **CI/CD (GitHub Actions):** en cada push, lint + typecheck + tests (Postgres como servicio).
    En `develop` → build de imágenes a GHCR y deploy a staging por SSH. En `main` → producción.
    El deploy corre migraciones antes de cambiar contenedores; si fallan, no se cambia nada.
    Rollback: volver a la etiqueta de imagen anterior.
  - **Backups:** `pg_dump` diario por cron del VPS → comprimido → R2 (bucket de backups), 30 días
    de retención; prueba de restauración documentada.
  - **Monitoreo:** Sentry (backend, worker y frontend) y UptimeRobot cada 5 min a `/api/v1/salud`.
- **Por qué:** mismo PostgreSQL en todos lados, entornos aislados en un VPS, rollback simple
  (FR-062 a FR-065).
- **Alternativas:** PM2 sin Docker (más simple de arrancar, pero staging y producción comparten
  Node y dependencias, y la base queda instalada en el sistema).

## R12. Pruebas

- **Decisión:**
  - **Unitarias (Vitest):** dominio puro (precios, máquina de estados, Dinero, vencimientos con
    `Reloj` falso).
  - **Integración (Vitest + Postgres real):** casos de uso y repositorios; base de pruebas
    recreada por archivo. Incluye concurrencia de stock con dos transacciones en paralelo.
  - **Contrato:** rutas con `fastify.inject()` validando respuestas contra los esquemas de
    `shared/`; webhook de Mercado Pago con firmas reales de ejemplo.
  - **Punta a punta (Playwright):** cuando exista el frontend, la compra completa en staging con
    el sandbox de Mercado Pago.
  - Cada test lleva el escenario de la spec en el nombre, por ejemplo
    `test("US2-03: dos compras de la última unidad", …)`.
- **Por qué:** principio VIII; lo que se rompe caro (stock, pagos, estados) se prueba sin UI.

## R13. Versiones a fijar al crear el proyecto

Node.js 24 LTS · pnpm 10 · TypeScript 5.x estricto · Fastify 5 · Zod 4 · Drizzle ORM y
drizzle-kit (última estable) · PostgreSQL 17 · Next.js 16 · Vitest 3 · Playwright (última
estable). Se fijan exactas en `package.json` y en las imágenes Docker al iniciar la fase de
Setup; se revisan las notas de versión de cada una en ese momento.
