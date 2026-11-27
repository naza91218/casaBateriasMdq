# Implementation Plan: Tienda online de La Casa de las Baterías

**Branch**: `001-tienda-online` | **Date**: 2026-10-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-tienda-online/spec.md`

## Summary

Tienda online propia con buscador por auto (marca → modelo → año → baterías de la medida
compatible), compra como invitado con Mercado Pago (instantáneo, reserva de 30 min),
transferencia (confirmada a mano, 48 h) o efectivo en el local, panel para el administrador,
mails por cada cambio de estado, SEO local y GEO, y operación en el VPS del cliente.

Enfoque técnico: monorepo con **backend** (API REST propia en Fastify, monolito modular en capas
con puertos y adaptadores, PostgreSQL 17 con Drizzle, worker con outbox) y **frontend** (Next.js,
se construye después de cerrar el diseño). Todo en Docker, con tres entornos. Por pedido del
usuario, **el backend se construye primero** y el frontend queda como un bloque posterior.

## Technical Context

**Language/Version**: TypeScript 5.x estricto sobre Node.js 24 LTS

**Primary Dependencies**: Backend: Fastify 5, Zod 4 (`fastify-type-provider-zod`,
`@fastify/swagger`), Drizzle ORM + drizzle-kit, SDK `mercadopago`, Resend + React Email,
`@aws-sdk/client-s3` (R2), sharp, pino, Sentry, csv-parse. Frontend (posterior): Next.js 16,
Tailwind CSS, shadcn/ui en el panel. Scraper: Playwright / cheerio.

**Storage**: PostgreSQL 17 en el VPS (contenedor con volumen); fotos en Cloudflare R2; backups
diarios a R2

**Testing**: Vitest (unitarias, integración contra Postgres real, contrato con `fastify.inject`);
Playwright para punta a punta cuando exista el frontend

**Target Platform**: VPS Linux (Ubuntu) de HostGator con Docker Compose y Nginx; desarrollo en
Windows con Docker Desktop

**Project Type**: Aplicación web: API REST + frontend SSR + worker

**Performance Goals**: Páginas públicas < 3 s en 4G y ≥ 90 en auditorías de Google (SC-008);
endpoints de catálogo y buscador p95 < 300 ms; crear pedido p95 < 1 s; cambios del admin visibles
en < 1 min (US5-03)

**Constraints**: VPS de 2–4 GB de RAM compartido por producción y staging; servicios externos en
planes gratuitos; 1 desarrollador; plazo comprometido de 30 días corridos; DNI nunca fuera del
panel; ninguna clave en el navegador

**Scale/Scope**: ~100–300 productos, ~2.000–5.000 filas de vehículos, hasta ~50 pedidos/día, 1
administrador; 8 historias, 78 requisitos funcionales

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio / regla (constitución v1.3.0) | Cómo lo cumple el diseño | Estado |
| :- | :- | :- |
| I. Compra simple, sin cuenta, celular primero | Checkout de invitado en una llamada (`POST /pedidos`); reglas de 375 px y 48 px aplican al bloque frontend | ✅ (UI pendiente) |
| II. El servicio es el diferencial | `GET /catalogo/productos/:slug` y `/configuracion/publica` devuelven el servicio incluido; buscador por auto como recurso central | ✅ |
| III. Nunca un callejón sin salida | El buscador, el checkout y el seguimiento devuelven siempre `whatsapp { url, mensaje }` con contexto | ✅ |
| IV. Alcance cerrado | Sin cuentas de cliente, turnos ni cupones; canje solo como consulta | ✅ |
| V. Dinero y stock confiables (NON-NEGOTIABLE) | UPDATE condicional en transacción; importes en centavos calculados en el servidor; pagado solo por API de MP verificada o confirmación manual con usuario registrado | ✅ |
| VI. Datos personales protegidos | AES-256-GCM, `redact` en logs, DNI solo en `GET /admin/pedidos/:id`, sin datos en outbox ni en analítica | ✅ |
| VII. Monolito modular, estados centralizados | Módulos con servicios propios; `cambiarEstado` única | ✅ |
| VIII. Cada criterio tiene un test | Tests con el ID del escenario; punta a punta antes de cada salida | ✅ |
| Hosting VPS, PostgreSQL en el VPS, tareas en el VPS, backups fuera | Docker Compose, worker propio, `pg_dump` → R2 | ✅ |
| Repo `frontend/` + `backend/` + `shared/`; frontend sin base ni secretos | Estructura de abajo; el frontend solo habla con la API | ✅ |
| Tres entornos | dev local, staging y prod en el VPS | ✅ |
| Servicios externos gratuitos, cuentas del negocio | R2, Resend, Sentry, UptimeRobot, GitHub en planes gratuitos | ✅ |
| Stack de la constitución | **Desvío:** Auth.js → enlace mágico propio en el backend; se suma Fastify | ⚠️ Justificado abajo; constitución pasa a v1.4.0 |

**Re-check post-diseño (fase 1):** el modelo de datos y los contratos mantienen todas las
compuertas. Sin violaciones nuevas.

## Project Structure

### Documentation (this feature)

```text
specs/001-tienda-online/
├── plan.md              # Este archivo
├── research.md          # Decisiones técnicas (fase 0)
├── data-model.md        # Tablas, reglas y máquina de estados (fase 1)
├── quickstart.md        # Cómo levantar y validar (fase 1)
├── contracts/           # API REST, webhook de Mercado Pago, planillas CSV (fase 1)
├── checklists/          # Calidad de la spec
└── tasks.md             # Lo genera /speckit-tasks
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── modules/
│   │   ├── catalogo/            # productos, marcas, medidas, fotos, revisión
│   │   ├── compatibilidad/      # vehículos → medidas, buscador
│   │   ├── importacion/         # planillas CSV
│   │   ├── pedidos/             # crear, reservar stock, estados, vencimientos
│   │   ├── pagos/               # Mercado Pago, transferencia, efectivo, alertas
│   │   ├── clientes/            # comprador, DNI cifrado, anonimización
│   │   ├── entregas/            # zonas
│   │   ├── notificaciones/      # outbox, plantillas React Email
│   │   ├── configuracion/
│   │   ├── legales/             # arrepentimiento
│   │   ├── canje/               # consultas de canje
│   │   └── auth/                # enlace mágico, sesiones, usuarios del panel
│   │       # cada módulo: domain/ · application/ · infrastructure/ · http/
│   ├── shared-kernel/           # Dinero, Reloj, errores de dominio, Result
│   ├── platform/                # config (Zod), db (Drizzle), logger, crypto, Sentry
│   ├── adapters/                # MercadoPagoPasarela, ResendMailer, R2Almacenamiento, FrontendRevalidador
│   ├── http/                    # server.ts, plugins (sesión, errores, rate limit, swagger)
│   ├── worker/                  # main.ts: outbox, vencimientos, revalidaciones
│   ├── composition-root.ts      # arma servicios con sus adaptadores (inversión de dependencias)
│   └── main.ts
├── db/
│   ├── migrations/
│   └── seed/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── contract/
└── Dockerfile

shared/
└── src/contratos/               # esquemas Zod de requests y responses (los usa el frontend)

frontend/                        # Next.js 16 — bloque posterior, cuando se cierre el diseño
├── src/app/(tienda)/ · src/app/panel/ · src/app/api/revalidate/
└── Dockerfile

tools/
└── scraper/                     # genera CSV de importación y fotos; no toca la base

infra/
├── docker-compose.dev.yml       # PostgreSQL + Mailpit para desarrollo
├── docker-compose.yml           # backend, worker, frontend, db (staging y prod)
├── nginx/                       # sitios prod y staging
├── scripts/                     # deploy.sh, backup.sh, restore.sh
└── README.md                    # operación, restauración, guía de soporte

.github/workflows/               # ci.yml, deploy-staging.yml, deploy-prod.yml
```

**Structure Decision**: aplicación web en monorepo (pnpm workspaces). El backend es un monolito
modular; cada módulo tiene cuatro capas (`domain` puro, `application` con casos de uso y puertos,
`infrastructure` con repositorios Drizzle, `http` con rutas delgadas). Las dependencias apuntan
hacia el dominio y se conectan en `composition-root.ts`. `shared/` contiene solo contratos.

## Diseño (resumen)

- **Patrones:** monolito modular, puertos y adaptadores, casos de uso, repositorio, máquina de
  estados con `cambiarEstado` única, unidad de trabajo (transacción), UPDATE condicional para
  stock, Strategy por medio de pago, value object `Dinero`, calculadora de precios pura, outbox
  transaccional, idempotencia por restricciones únicas, capa anticorrupción para el scraper,
  pipeline de importación. Detalle y motivos en [research.md](research.md).
- **SOLID:** casos de uso de responsabilidad única; medios de pago y plantillas extensibles sin
  modificar el checkout; adaptadores intercambiables (reales y falsos en tests); puertos chicos
  por necesidad; dependencias invertidas desde el composition root.
- **Datos:** [data-model.md](data-model.md). **API:** [contracts/api-rest.md](contracts/api-rest.md).
- **Entornos:** desarrollo local (Docker para base y Mailpit), staging y producción en el VPS con
  Docker Compose; CI/CD con GitHub Actions (ver research R11).

## Orden de construcción (backend primero)

| Fase | Contenido | Historias |
| :- | :- | :- |
| 1. Setup | Monorepo, TypeScript, lint, Vitest, Docker de desarrollo, CI | — |
| 2. Fundaciones | Config, base y migraciones, shared-kernel, logger con redact, cifrado, servidor Fastify, errores, outbox y worker base, auth del panel, seed | — |
| 3. Catálogo y buscador | Módulos catálogo, compatibilidad, configuración pública, SEO índice | US1 |
| 4. Compra y pagos | Pedidos, stock, precios, entregas, Mercado Pago, transferencia, efectivo, vencimientos, seguimiento, canje | US2 |
| 5. Panel | Pedidos, confirmaciones, estados, alertas | US3 |
| 6. Catálogo del panel | Productos, revisión, fotos, importación, vehículos, configuración, zonas; scraper | US5 |
| 7. Mails | Plantillas y eventos completos | US4 |
| 8. Legales y datos | Arrepentimiento, anonimización, verificaciones de DNI | US7 |
| 9. Operación | Imágenes, Compose de staging/prod, Nginx, deploy, backups, monitoreo | US8 |
| 10. Frontend (posterior) | Tienda, panel, SEO/GEO (sitemap, datos estructurados, `llms.txt`), analítica, Playwright | US1–US7 (UI), US6 |

Las fases 3 y 4 forman el producto mínimo del lado del servidor. La fase 10 se planifica en
detalle cuando el diseño UX/UI esté definido.

## Riesgos

| Riesgo | Mitigación |
| :- | :- |
| 30 días para backend + frontend + operación con 1 dev | Backend primero; frontend sobre contratos ya probados; priorizar P1 |
| Calidad de los datos scrapeados | Todo entra `a_revisar`; Mateo aprueba; `fuente` en cada fila |
| RAM del VPS (prod + staging + Postgres) | Imágenes slim, límites de memoria en Compose; staging apagable; recomendado 4 GB |
| Licencia web de Sport Headline | Se resuelve en el bloque frontend |
| Datos del comercio y bancarios pendientes | Configurables desde el panel; marcadores hasta tenerlos |

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Auth.js reemplazado por enlace mágico propio | Con la API separada (opción A), el login debe vivir en el backend; Auth.js está atado a Next.js | Usar Auth.js en el frontend obligaría a que Next.js acceda a la base, prohibido por la constitución |
| Se suma Fastify como framework del backend | La constitución pide un backend propio y no fijaba framework | Next.js API routes mezclaría backend y frontend en un mismo proceso |
| Worker como proceso separado | Mails con reintentos y vencimientos cada minuto sin frenar la API | Cron del sistema no es transaccional ni reintenta |
