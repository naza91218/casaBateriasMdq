---

description: "Tareas de implementación de la tienda online de La Casa de las Baterías"
---

# Tasks: Tienda online de La Casa de las Baterías

**Input**: Design documents from `/specs/001-tienda-online/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: incluidos. La constitución (principio VIII) exige un test por cada criterio de
aceptación. Cada test lleva el ID del escenario en el nombre (por ejemplo
`test("US2-03: dos compras de la última unidad", …)`) y se escribe **antes** de implementar: tiene
que fallar primero.

**Organization**: por historia de usuario. Por pedido del usuario, **el backend va primero**: las
fases 3 a 10 son backend; la fase 11 es el frontend, que se arranca cuando el diseño UX/UI esté
cerrado y se refina en ese momento.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: historia de la spec (US1 a US8)
- Rutas relativas a la raíz del repo

## Path Conventions

- Backend: `backend/src/modules/<modulo>/{domain,application,infrastructure,http}/`
- Esquema Drizzle de cada módulo: `backend/src/modules/<modulo>/infrastructure/schema.ts`
- Tests: `backend/tests/{unit,integration,contract}/<modulo>/`
- Contratos compartidos: `shared/src/contratos/`
- Frontend: `frontend/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: monorepo, herramientas y entorno de desarrollo

- [X] T001 Crear el monorepo pnpm con `package.json` raíz (scripts `dev`, `test`, `lint`, `typecheck`), `pnpm-workspace.yaml` con `backend`, `shared`, `frontend`, `tools/*`, y `.nvmrc` con Node 24 LTS
- [X] T002 Crear `tsconfig.base.json` en la raíz (strict, `noUncheckedIndexedAccess`, ES2023, módulos NodeNext) y `backend/tsconfig.json`, `shared/tsconfig.json` que lo extiendan
- [X] T003 [P] Inicializar `backend/package.json` con Fastify 5, Zod 4, `fastify-type-provider-zod`, `@fastify/swagger`, `@fastify/swagger-ui`, `@fastify/cookie`, `@fastify/multipart`, `@fastify/rate-limit`, `drizzle-orm`, `drizzle-kit`, `postgres`, `pino`, `@sentry/node`, `tsx`, `vitest`; scripts `dev`, `worker:dev`, `build`, `db:generate`, `db:migrate`, `db:seed`, `test`
- [X] T004 [P] Inicializar `shared/package.json` (paquete `@casa/shared`) con Zod 4 y `shared/src/index.ts`
- [X] T005 [P] Configurar ESLint (flat config) y Prettier en `eslint.config.js` y `.prettierrc` en la raíz, con regla que prohíba importar `infrastructure/` desde `domain/`
- [X] T006 [P] Crear `infra/docker-compose.dev.yml` con PostgreSQL 17 (puerto 5432, volumen `db-data`, base `casa_dev` y `casa_test`) y Mailpit (puertos 1025 y 8025), comentado para quien no usó Docker
- [X] T007 [P] Crear `backend/.env.example` con todas las variables (DATABASE_URL, TEST_DATABASE_URL, API_PUBLIC_URL, FRONTEND_URL, REVALIDATE_SECRET, SESSION_SECRET, DNI_ENCRYPTION_KEY, DNI_KEY_VERSION, MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET, RESEND_API_KEY, MAIL_FROM, MAIL_ADMIN, SMTP_DEV_HOST, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL, SENTRY_DSN, NODE_ENV)
- [X] T008 [P] Configurar Vitest en `backend/vitest.config.ts` con proyectos `unit`, `integration` (setup que recrea `casa_test` por archivo) y `contract`
- [X] T009 [P] Crear `.github/workflows/ci.yml`: pnpm install, lint, typecheck y tests con servicio PostgreSQL 17 en cada push y PR
- [X] T010 [P] Actualizar `.gitignore` con `.env*` (salvo `.env.example`), `data/import/`, `dist/`, `.turbo/`

**Checkpoint**: `pnpm install`, `pnpm lint` y `pnpm typecheck` pasan; `docker compose -f infra/docker-compose.dev.yml up -d` levanta base y Mailpit

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: base común que necesitan todas las historias

**⚠️ CRITICAL**: ninguna historia empieza hasta terminar esta fase

### Tests de fundaciones

- [X] T011 [P] Test unitario de `Dinero` (suma, resta, porcentaje con redondeo a centavo, nunca negativo) en `backend/tests/unit/shared-kernel/dinero.test.ts`
- [X] T012 [P] Test unitario de cifrado AES-256-GCM (ida y vuelta, IV distinto por llamada, falla con tag alterado, versión de clave) en `backend/tests/unit/platform/crypto.test.ts`
- [X] T013 [P] Test unitario del logger: `dni`, `direccion`, `calle`, `telefono`, `email`, `nombre` quedan ocultos en `backend/tests/unit/platform/logger.test.ts`
- [X] T014 [P] Test de contrato del formato de error (`{ error: { codigo, mensaje, campos } }`, 400 en validación, 404, 409, 429) en `backend/tests/contract/http/errores.test.ts`
- [X] T015 [P] Test de integración del outbox: un mensaje con la misma clave `(evento, pedido_id, destinatario)` se encola una sola vez; reintento con espera exponencial 1, 5, 15, 60 min hasta 8 intentos en `backend/tests/integration/notificaciones/outbox.test.ts`
- [X] T016 [P] Test de integración de auth: enlace de 15 min y un solo uso, sesión de 30 días, cookie `httpOnly`/`Secure`/`SameSite=Lax`, respuesta idéntica para mail no autorizado (US3-01, US3-02) en `backend/tests/integration/auth/auth.test.ts`

### Implementación de fundaciones

- [X] T017 Implementar la configuración validada con Zod (falla al arrancar si falta una variable) en `backend/src/platform/config.ts`
- [X] T018 [P] Implementar el value object `Dinero` en centavos enteros (`bigint`) en `backend/src/shared-kernel/dinero.ts`
- [X] T019 [P] Implementar el puerto `Reloj` (real y falso para tests) en `backend/src/shared-kernel/reloj.ts`
- [X] T020 [P] Implementar errores de dominio (`ErrorDeDominio` con `codigo` y `mensaje` en voseo) y `Result` en `backend/src/shared-kernel/errores.ts`
- [X] T021 [P] Implementar cifrado AES-256-GCM con IV aleatorio y versión de clave en `backend/src/platform/crypto.ts`
- [X] T022 [P] Implementar el logger pino con `redact` de datos personales en `backend/src/platform/logger.ts`
- [X] T023 Implementar el cliente de base (driver `postgres` + Drizzle), el helper de transacciones y el agregador de esquemas en `backend/src/platform/db.ts` y `backend/src/platform/schema.ts`
- [X] T024 Configurar `backend/drizzle.config.ts` apuntando a `backend/db/migrations/` y a los esquemas de cada módulo
- [X] T025 Crear el esquema de configuración: tabla `configuracion` de fila única (`CHECK (id = 1)`, `descuento_pct numeric(5,2)` entre 0 y 50 con inicial 10, datos bancarios, `whatsapp`, `horarios jsonb`, datos del comercio, `google_resenas_url`, `horas_venc_transferencia` 48, `minutos_venc_mercadopago` 30) en `backend/src/modules/configuracion/infrastructure/schema.ts`
- [X] T026 [P] Crear el esquema de entregas: `zonas_colocacion` (`nombre` UNIQUE, `costo_extra bigint` default 0, `activa`) en `backend/src/modules/entregas/infrastructure/schema.ts`
- [X] T027 [P] Crear el esquema de auth: `usuarios_panel` (`email citext` UNIQUE, `rol` 'admin', `activo`), `enlaces_ingreso` (`token_hash` PK SHA-256, `vence_en` +15 min, `usado_en`), `sesiones` (`id_hash` PK, `vence_en` +30 días, `revocada_en`) en `backend/src/modules/auth/infrastructure/schema.ts`
- [X] T028 [P] Crear el esquema de notificaciones: `outbox_mensajes` (`evento`, `pedido_id` null, `destinatario` enum `comprador`/`admin`, `datos jsonb` sin DNI, `estado` enum `pendiente`/`enviado`/`fallido`, `intentos` máx. 8, `proximo_intento_en`, `ultimo_error`, `enviado_en`, UNIQUE `(evento, pedido_id, destinatario)`) en `backend/src/modules/notificaciones/infrastructure/schema.ts`
- [X] T029 Generar la primera migración con drizzle-kit en `backend/db/migrations/` (incluye extensión `citext`)
- [X] T030 Implementar el servidor Fastify con type provider Zod, prefijo `/api/v1`, cookies, rate limit, multipart, Swagger solo fuera de producción y `GET /salud` (verifica la base) en `backend/src/http/server.ts`
- [X] T031 Implementar el manejador global de errores (mapea `ErrorDeDominio` y Zod al formato del contrato, sin datos personales en la respuesta ni en el log) en `backend/src/http/plugins/errores.ts`
- [X] T032 [P] Integrar Sentry con `beforeSend` que elimina cuerpos de request y cookies en `backend/src/platform/sentry.ts`
- [X] T033 Definir los puertos `Mailer`, `Almacenamiento`, `PasarelaPago`, `Revalidador` en `backend/src/shared-kernel/puertos.ts`
- [X] T034 [P] Implementar `MailerDev` (SMTP a Mailpit) y `MailerResend` en `backend/src/adapters/mailer.ts`
- [X] T035 Implementar el servicio de outbox (`encolar` dentro de la transacción del llamador; `tomarPendientes` con `FOR UPDATE SKIP LOCKED`; `marcarEnviado`/`marcarFallido` con espera exponencial) en `backend/src/modules/notificaciones/application/outbox.ts`
- [X] T036 Implementar el worker con bucles separados (outbox cada 10 s, vencimientos cada 1 min) y apagado ordenado en `backend/src/worker/main.ts`
- [X] T037 Implementar el módulo auth: pedir enlace (rate limit por IP y mail, respuesta 202 siempre igual), verificar enlace (crea sesión y cookie, redirige a `/panel` o a `/panel/ingresar?error=enlace_vencido`), sesión actual y salir en `backend/src/modules/auth/application/` y `backend/src/modules/auth/http/rutas.ts`
- [X] T038 Implementar el plugin `requiereSesion` para todas las rutas `/admin` (401 sin sesión) que expone `request.usuario` en `backend/src/http/plugins/sesion.ts`
- [X] T039 Implementar el módulo configuración: servicio de lectura y `GET /configuracion/publica` (descuento, WhatsApp, horarios, datos del comercio, zonas activas, URL de reseñas) en `backend/src/modules/configuracion/`
- [X] T040 Crear el composition root que arma servicios con sus adaptadores según el entorno en `backend/src/composition-root.ts` y la entrada `backend/src/main.ts`
- [X] T041 [P] Crear los contratos Zod comunes (error, paginación, `Dinero` serializado como entero, WhatsApp `{ url, mensaje }`) en `shared/src/contratos/comunes.ts`
- [X] T042 Crear el seed base: zona "Mar del Plata"; configuración inicial; un usuario del panel con `MAIL_ADMIN` en `backend/db/seed/base.ts` (marcas y medidas se siembran en T057, después de crear sus tablas en T046)

**Checkpoint** ✅ (verificado 2026-10-29): la API arranca, `GET /api/v1/salud` responde 200, el ingreso al panel funciona con el enlace en Mailpit, el worker envía mails del outbox

---

## Phase 3: User Story 1 — Encontrar la batería para mi auto (Priority: P1) 🎯 MVP

**Goal**: buscador marca → modelo → año y catálogo con filtros y ficha, por API

**Independent Test**: con el seed de ejemplo, `GET /vehiculos/compatibles?marca=volkswagen&modelo=gol-trend&anio=2015` devuelve las dos 12x65 con la económica primero; filtros y ficha responden según la spec

### Tests for User Story 1 ⚠️

- [X] T043 [P] [US1] Tests de integración del buscador: US1-01 (dos baterías, económica primero), US1-02 (año fuera de rango no figura), US1-03 (auto no cargado → `auto_no_cargado` + WhatsApp con marca, modelo y año), US1-04 (sin stock → `sin_stock` + WhatsApp) en `backend/tests/integration/compatibilidad/buscador.test.ts`
- [X] T044 [P] [US1] Tests de integración del catálogo: US1-06 (filtro marca + gama combinable), US1-07 (stock 0 → `disponible: false` + WhatsApp con el producto), US1-08 (pausado → 404 y fuera de listados), US1-09 (precio de lista y precio por transferencia o efectivo con 10 %) en `backend/tests/integration/catalogo/catalogo.test.ts`
- [X] T045 [P] [US1] Tests de contrato de `GET /catalogo/*` y `GET /vehiculos/*` contra los esquemas de `shared/` (sin campos de más) en `backend/tests/contract/catalogo/rutas.test.ts`

### Implementation for User Story 1

- [X] T046 [P] [US1] Crear el esquema de catálogo: `marcas` (`nombre` y `slug` UNIQUE, `activa`), `medidas` (`codigo` PK formato `12x65`, `orden`), `productos` (`sku` UNIQUE, `slug` UNIQUE, `marca_id`, `medida`, `amperaje_ah` > 0, `cca` null permitido, `gama` enum `economica`/`reforzada`, `precio_lista bigint`, `stock int CHECK (stock >= 0)`, `estado` enum `a_revisar`/`activo`/`pausado`/`archivado` default `a_revisar`, `fuente`; índices `(estado, medida)` y `(estado, marca_id, gama)`), `producto_fotos` (`clave`, `orden`, `origen` enum `marca`/`propia`, ON DELETE CASCADE) en `backend/src/modules/catalogo/infrastructure/schema.ts`
- [X] T047 [P] [US1] Crear el esquema de compatibilidad: `vehiculos` (`marca`, `marca_slug`, `modelo`, `modelo_slug`, `anio_desde`, `anio_hasta` con `CHECK (anio_hasta >= anio_desde)`, `motor` null = cualquiera, `fuente`, UNIQUE `(marca_slug, modelo_slug, anio_desde, anio_hasta, coalesce(motor, ''))`) y `vehiculo_medidas` (PK `(vehiculo_id, medida)`) en `backend/src/modules/compatibilidad/infrastructure/schema.ts`
- [X] T048 [US1] Generar la migración de catálogo y compatibilidad en `backend/db/migrations/`
- [X] T049 [P] [US1] Implementar la calculadora pura de precios (precio de lista, descuento % de configuración, redondeo a centavo) en `backend/src/modules/catalogo/domain/precios.ts`
- [X] T050 [P] [US1] Implementar el generador de enlaces de WhatsApp con mensaje precargado ("Hola, busco batería para un {marca} {modelo} {año}" y variantes por producto) en `backend/src/shared-kernel/whatsapp.ts`
- [X] T051 [US1] Implementar el repositorio de catálogo (listado filtrado de `activo`, ficha por slug, foto principal) en `backend/src/modules/catalogo/infrastructure/repositorio.ts`
- [X] T052 [US1] Implementar el servicio de catálogo (`listar`, `obtenerFicha` con precios, servicio incluido, autos compatibles, `disponible`) en `backend/src/modules/catalogo/application/catalogo.ts`
- [X] T053 [US1] Implementar el repositorio y servicio de compatibilidad (marcas con datos, modelos, años como unión de rangos, medidas de un vehículo, productos activos con stock agrupados por gama, económica primero) en `backend/src/modules/compatibilidad/application/buscador.ts` y `backend/src/modules/compatibilidad/infrastructure/repositorio.ts`
- [X] T054 [P] [US1] Crear los contratos Zod de catálogo y buscador en `shared/src/contratos/catalogo.ts` y `shared/src/contratos/vehiculos.ts`
- [X] T055 [US1] Implementar las rutas `GET /catalogo/marcas`, `/catalogo/medidas`, `/catalogo/productos`, `/catalogo/productos/:slug` en `backend/src/modules/catalogo/http/rutas.ts`
- [X] T056 [US1] Implementar las rutas `GET /vehiculos/marcas`, `/vehiculos/modelos`, `/vehiculos/anios`, `/vehiculos/compatibles` en `backend/src/modules/compatibilidad/http/rutas.ts`
- [X] T057 [US1] Sembrar marcas Sermat, Herbo, Volta, Edna y medidas 12x65, 12x75, 12x90, 12x110, 12x160 en `backend/db/seed/catalogo.ts`, y crear el seed de ejemplo (Gol Trend 2008–2023 → 12x65, Corsa 2009, productos Sermat económica y Herbo reforzada 12x65, uno sin stock, uno pausado) en `backend/db/seed/ejemplo.ts`

**Checkpoint** ✅ (verificado 2026-10-29): US1 completa por API; validaciones 1 y 2 de [quickstart.md](quickstart.md) pasan

---

## Phase 4: User Story 2 — Comprar como invitado y pagar (Priority: P1)

**Goal**: cotizar, crear pedido con reserva atómica de stock, cobrar con Mercado Pago, transferencia o efectivo, seguimiento, vencimientos y consulta de canje

**Independent Test**: crear pedidos con cada medio y entrega; con el sandbox de Mercado Pago o el adaptador falso, el pago aprobado pasa el pedido a `pagado`; un pedido MP vencido a los 30 min se cancela y devuelve stock

### Tests for User Story 2 ⚠️

- [X] T058 [P] [US2] Tests unitarios de la máquina de estados (todas las transiciones válidas de data-model y rechazo de las demás, US3-07) en `backend/tests/unit/pedidos/maquina-estados.test.ts`
- [X] T059 [P] [US2] Tests unitarios de importes: US2-04 (precio del navegador ignorado), US2-06 (10 % → $90.000), US2-15 (zona Batán +$5.000 desglosado) en `backend/tests/unit/pedidos/importes.test.ts`
- [X] T060 [P] [US2] Tests de integración de creación de pedido: US2-01 (colocación sin dirección → "Falta la dirección para ir a colocarla"), US2-02 (DNI con letras → "El DNI tiene solo números, sin puntos"), US2-03 (dos compras concurrentes de la última unidad: una crea, otra "Se agotó mientras comprabas", stock 0), US2-05 (sin efectivo con colocación) en `backend/tests/integration/pedidos/crear-pedido.test.ts`
- [X] T061 [P] [US2] Tests de integración de vencimientos con `Reloj` falso: MP a 31 min → `cancelado` y stock devuelto; MP a 29 min sigue; transferencia a 49 h → cancelado; a 47 h sigue (US2-16); efectivo nunca vence; US2-17 (cancelar dos veces no suma stock dos veces) en `backend/tests/integration/pedidos/vencimientos.test.ts`
- [X] T062 [P] [US2] Tests de contrato del webhook de Mercado Pago: US2-07 (aprobado → `pagado` y pago registrado), US2-09 (tres veces → un cambio y un mail), US2-10 (firma inválida → 401), US2-11 (monto distinto → alerta, sin pagar), pago sobre pedido cancelado → alerta, US2-12 (rechazado → sigue pendiente) en `backend/tests/contract/pagos/webhook-mercadopago.test.ts`
- [X] T063 [P] [US2] Tests de contrato del seguimiento: US2-08 (vuelta de MP sin webhook → `pagoEnVerificacion`), US2-13 (sin DNI en la respuesta), US2-14 (token incorrecto → 404) en `backend/tests/contract/pedidos/seguimiento.test.ts`
- [X] T064 [P] [US2] Test de integración de la preferencia de MP: `expires: true`, vencimiento = `pedido.vence_en`, `excluded_payment_types` `ticket` y `atm`, `external_reference` = id del pedido en `backend/tests/integration/pagos/preferencia.test.ts`
- [X] T065 [P] [US2] Test de integración de consulta de canje: se guarda y devuelve WhatsApp con el resumen; localidad fuera de Mar del Plata o zonas activas → error claro en `backend/tests/integration/canje/consulta.test.ts`

### Implementation for User Story 2

- [X] T066 [P] [US2] Crear el esquema de pedidos: `pedidos` (`numero` UNIQUE desde 1001, `token_seguimiento_hash`, `estado` enum, `entrega` enum `colocacion`/`retiro`, `zona_id` obligatorio si colocación, `medio_pago` enum `mercadopago`/`transferencia`/`efectivo`, `subtotal`, `descuento`, `costo_zona`, `total`, `descuento_pct_aplicado numeric(5,2)`, `vence_en` null para efectivo; índices `(estado, vence_en)` y `(estado, creado_en desc)`), `pedido_items` (`nombre_producto`, `cantidad CHECK > 0`, `precio_unitario`), `pedido_eventos` (`de`, `a`, `actor`, `motivo`, `rechazado`) en `backend/src/modules/pedidos/infrastructure/schema.ts`
- [X] T067 [P] [US2] Crear el esquema de clientes: `pedido_compradores` (PK `pedido_id`, `nombre`, `dni_cifrado bytea`, `dni_clave_version smallint`, `telefono`, `email`, `calle`, `numero`, `referencias`, `anonimizado_en`) en `backend/src/modules/clientes/infrastructure/schema.ts`
- [X] T068 [P] [US2] Crear el esquema de pagos: `pagos` (`medio`, `id_externo`, `estado`, `monto`, `confirmado_por` obligatorio en manuales, `payload jsonb` sin datos personales, UNIQUE `(medio, id_externo)` donde `id_externo` no es null) y `alertas` (`tipo` enum `monto_distinto`/`pago_sobre_cancelado`/`pago_tardio_transferencia`, `detalle`, `resuelta_en`, `resuelta_por`) en `backend/src/modules/pagos/infrastructure/schema.ts`
- [X] T069 [P] [US2] Crear el esquema de canje: `consultas_canje` (`nombre` y `telefono` obligatorios, `bateria_usada`, `auto`, `localidad`, `producto_id` null, `estado` enum `pendiente`/`atendida`) en `backend/src/modules/canje/infrastructure/schema.ts`
- [X] T070 [US2] Generar la migración de pedidos, clientes, pagos y canje (secuencia `numero` desde 1001) en `backend/db/migrations/`
- [X] T071 [P] [US2] Implementar la máquina de estados pura (tabla de transiciones de data-model, transiciones permitidas por estado y entrega) en `backend/src/modules/pedidos/domain/maquina-estados.ts`
- [X] T072 [P] [US2] Implementar las estrategias de medio de pago (`MercadoPago`, `Transferencia`, `Efectivo`: disponibilidad según entrega, descuento, estado inicial, vencimiento 30 min / 48 h / sin vencimiento) en `backend/src/modules/pagos/domain/medios-pago.ts`
- [X] T073 [P] [US2] Implementar el cálculo de importes del pedido (subtotal, descuento, costo de zona, total) reutilizando `precios.ts` en `backend/src/modules/pedidos/domain/importes.ts`
- [X] T074 [US2] Implementar el servicio de clientes (guardar comprador con DNI cifrado, leer descifrado solo para el panel) en `backend/src/modules/clientes/application/compradores.ts`
- [X] T075 [US2] Implementar en catálogo `reservarStock` y `devolverStock` con UPDATE condicional (`stock = stock - n WHERE id = ? AND estado = 'activo' AND stock >= n`) dentro de la transacción recibida en `backend/src/modules/catalogo/application/stock.ts`
- [X] T076 [US2] Implementar `cambiarEstado(pedido, a, actor, motivo)`: bloquea la fila con `FOR UPDATE`, valida, aplica efectos (devolver stock al cancelar una sola vez, registrar pago manual), registra el evento, encola mails y registra intentos rechazados en `backend/src/modules/pedidos/application/cambiar-estado.ts`
- [X] T077 [US2] Implementar `cotizar` y `crearPedido` (validación Zod, importes en servidor, reserva atómica, número correlativo, token de seguimiento con hash, comprador, evento inicial, mail "pedido recibido" y aviso al admin por outbox) en `backend/src/modules/pedidos/application/crear-pedido.ts`
- [X] T078 [US2] Implementar el adaptador `MercadoPagoPasarela` (crear preferencia según [contracts/webhook-mercadopago.md](contracts/webhook-mercadopago.md), consultar pago, verificar firma HMAC en tiempo constante) y un adaptador falso para tests en `backend/src/adapters/mercadopago.ts`
- [X] T079 [US2] Implementar el procesamiento de notificaciones de pago (idempotencia por `(medio, id_externo)`, tabla de decisiones del contrato, alertas) en `backend/src/modules/pagos/application/procesar-pago.ts`
- [X] T080 [US2] Implementar el servicio de seguimiento (verifica token, arma respuesta sin DNI, `pagoEnVerificacion`, datos bancarios si es transferencia) y `reintentarPago` en `backend/src/modules/pedidos/application/seguimiento.ts`
- [X] T081 [US2] Implementar el job de vencimientos (pedidos `pendiente_pago` con `vence_en` < ahora → `cambiarEstado(cancelado, 'worker', 'vencido')`) y registrarlo en el worker en `backend/src/modules/pedidos/application/vencimientos.ts`
- [X] T082 [P] [US2] Crear los contratos Zod de checkout, pedido y seguimiento en `shared/src/contratos/pedidos.ts`
- [X] T083 [US2] Implementar las rutas `POST /checkout/cotizar`, `POST /pedidos`, `GET /pedidos/:id`, `POST /pedidos/:id/reintentar-pago` con rate limit en `backend/src/modules/pedidos/http/rutas.ts`
- [X] T084 [US2] Implementar la ruta `POST /webhooks/mercadopago` (401 firma inválida, 200 rápido, 500 si falla la consulta a MP) en `backend/src/modules/pagos/http/webhook.ts`
- [X] T085 [US2] Implementar el módulo de canje: servicio y `POST /consultas-canje` que devuelve el WhatsApp con el resumen en `backend/src/modules/canje/`
- [X] T086 [US2] Implementar las plantillas mínimas "pedido recibido" (con datos bancarios, monto y plazo de 48 h si es transferencia), "pago confirmado", "cancelado" y aviso al admin, sin DNI, en `backend/src/modules/notificaciones/plantillas/`

**Checkpoint** ✅ (verificado 2026-10-29): US1 + US2 = producto mínimo del lado del servidor; validaciones 3 a 5, 7 y 8 de [quickstart.md](quickstart.md) pasan

---

## Phase 5: User Story 3 — Gestionar pedidos desde el panel (Priority: P2)

**Goal**: el administrador ve, confirma pagos manuales y mueve estados de los pedidos

**Independent Test**: con pedidos de prueba, confirmar una transferencia, registrar un efectivo y recorrer los estados por API con sesión

### Tests for User Story 3 ⚠️

- [X] T087 [P] [US3] Tests de integración: US3-03 (confirmar transferencia → `pagado`, pago manual con `confirmado_por` y fecha, mail al comprador), US3-04 (registrar efectivo → `entregado`), US3-06 (`transicionesPermitidas` de un entregado vacía), US3-07 (transición inválida → 409 y evento rechazado) en `backend/tests/integration/pedidos/panel-pedidos.test.ts`
- [X] T088 [P] [US3] Tests de contrato de `/admin/pedidos*` y `/admin/alertas*` (401 sin sesión, DNI solo en el detalle, antigüedad en días de `a_pagar_en_local`, links a mapa y WhatsApp) en `backend/tests/contract/pedidos/admin-rutas.test.ts`

### Implementation for User Story 3

- [X] T089 [US3] Implementar consultas del panel: listado por estado (nuevos primero, antigüedad en días, destacando `a_pagar_en_local` de más de 48 h) y detalle (comprador con DNI descifrado, pagos, eventos, alertas, `transicionesPermitidas`, URL de Google Maps y de WhatsApp) en `backend/src/modules/pedidos/application/consultas-panel.ts`
- [X] T090 [US3] Implementar `confirmarTransferencia` y `registrarEfectivo` sobre `cambiarEstado` con registro de pago manual en `backend/src/modules/pagos/application/pagos-manuales.ts`
- [X] T091 [US3] Implementar el servicio de alertas (listar abiertas, resolver con usuario y fecha) en `backend/src/modules/pagos/application/alertas.ts`
- [X] T092 [US3] Implementar `GET /admin/resumen` (pedidos nuevos, alertas abiertas; los contadores de productos y canje se suman en US5) en `backend/src/http/rutas-admin-resumen.ts`
- [X] T093 [P] [US3] Crear los contratos Zod del panel de pedidos en `shared/src/contratos/admin-pedidos.ts`
- [X] T094 [US3] Implementar las rutas `GET /admin/pedidos`, `GET /admin/pedidos/:id`, `POST .../confirmar-transferencia`, `POST .../registrar-efectivo`, `POST .../estado`, `GET /admin/alertas`, `POST /admin/alertas/:id/resolver` en `backend/src/modules/pedidos/http/rutas-admin.ts` y `backend/src/modules/pagos/http/rutas-admin.ts`
- [X] T095 [US3] Agregar las plantillas "en camino", "listo para retirar" y "entregado" (con enlace de reseñas de Google, FR-076) en `backend/src/modules/notificaciones/plantillas/`

**Checkpoint**: validación 6 de [quickstart.md](quickstart.md) pasa

---

## Phase 6: User Story 5 — Mantener el catálogo y la configuración (Priority: P2)

**Goal**: productos, revisión, fotos, importación por planilla, vehículos, configuración, zonas y consultas de canje desde el panel; scraper para la carga inicial

**Independent Test**: importar planillas de productos y compatibilidades, habilitar y eliminar productos, cambiar precio y descuento y verificar en las rutas públicas

### Tests for User Story 5 ⚠️

- [X] T096 [P] [US5] Tests de integración de importación: US5-01 (20 filas, 2 inválidas → 18 ok + informe con fila y motivo), US5-02 (SKU existente actualiza sin duplicar), productos nuevos en `a_revisar`, US5-07 (compatibilidades → buscador) en `backend/tests/integration/importacion/importacion.test.ts`
- [X] T097 [P] [US5] Tests de integración de productos: US5-03 (cambio de precio visible y revalidación encolada), US5-04 (pausar oculta), US5-05 (habilitar 25 y eliminar 15 en lote), US5-06 (archivado conserva nombre y precio en pedido viejo), activar exige precio y foto en `backend/tests/integration/catalogo/admin-productos.test.ts`
- [X] T098 [P] [US5] Tests de integración de configuración: US5-08 (descuento 10 → 12 % cambia precios y cotización), zonas activas en checkout en `backend/tests/integration/configuracion/admin-configuracion.test.ts`
- [X] T099 [P] [US5] Tests de contrato de `/admin/productos*`, `/admin/importaciones`, `/admin/vehiculos*`, `/admin/configuracion`, `/admin/zonas*`, `/admin/consultas-canje` (incluido `formato=csv`) en `backend/tests/contract/catalogo/admin-rutas.test.ts`

### Implementation for User Story 5

- [X] T100 [P] [US5] Crear el esquema de importación: `importaciones` (`tipo` enum `productos`/`compatibilidades`, contadores, `errores jsonb` `[{fila, campo, motivo}]`, `usuario_id`) en `backend/src/modules/importacion/infrastructure/schema.ts` y generar la migración en `backend/db/migrations/`
- [X] T101 [P] [US5] Implementar el adaptador `Almacenamiento` R2 (S3) y uno de disco local para desarrollo en `backend/src/adapters/almacenamiento.ts`
- [X] T102 [P] [US5] Implementar el adaptador `Revalidador` (POST a `{FRONTEND_URL}/api/revalidate` con `x-revalidate-secret`; no-op si no hay frontend) y su encolado por outbox en `backend/src/adapters/revalidador.ts`
- [X] T103 [US5] Implementar el servicio de productos del panel (crear, editar precio/stock/estado/datos, activar solo con `precio_lista > 0` y al menos una foto, eliminar o archivar según tenga pedidos, revisión en lote, revalidación) en `backend/src/modules/catalogo/application/admin-productos.ts`
- [X] T104 [US5] Implementar el servicio de fotos (subir con sharp a WebP máx. 1600 px sin EXIF, ordenar, borrar, `origen`) en `backend/src/modules/catalogo/application/fotos.ts`
- [X] T105 [US5] Implementar el pipeline de importación según [contracts/importacion-csv.md](contracts/importacion-csv.md) (csv-parse, validación Zod por fila, upsert por SKU o clave de vehículo, fotos por ruta o URL, máx. 5.000 filas / 5 MB, informe) en `backend/src/modules/importacion/application/importar.ts`
- [X] T106 [US5] Implementar el servicio de vehículos del panel (alta, edición, baja, medidas) en `backend/src/modules/compatibilidad/application/admin-vehiculos.ts`
- [X] T107 [US5] Implementar la edición de configuración y zonas (descuento 0–50, datos bancarios, horarios, WhatsApp, comercio, reseñas; revalidación de páginas públicas) en `backend/src/modules/configuracion/application/admin-configuracion.ts` y `backend/src/modules/entregas/application/zonas.ts`
- [X] T108 [US5] Implementar el listado de consultas de canje con cambio de estado y descarga CSV en `backend/src/modules/canje/application/admin-consultas.ts`
- [X] T109 [P] [US5] Crear los contratos Zod del panel de catálogo, importación, vehículos, configuración, zonas y canje en `shared/src/contratos/admin-catalogo.ts`
- [X] T110 [US5] Implementar las rutas `/admin/productos*`, `/admin/productos/revision`, fotos, `/admin/importaciones`, `/admin/vehiculos*`, `/admin/configuracion`, `/admin/zonas*`, `/admin/consultas-canje*` en los `http/rutas-admin.ts` de cada módulo, y sumar contadores de productos a revisar y consultas pendientes a `GET /admin/resumen`
- [X] T111 [P] [US5] Crear el scraper base (CLI, `robots.txt`, 1 pedido cada 2 s, User-Agent identificado, salida CSV con el formato de importación y fotos en `data/import/fotos/`, sin precios) en `tools/scraper/src/`
- [X] T112 [US5] Implementar la fuente Herbo (catálogo, especificaciones, compatibilidades, fotos) en `tools/scraper/src/fuentes/herbo.ts`
- [X] T113 [US5] Implementar la fuente Sermat/Volta desde el catálogo oficial en PDF que pasó el cliente (fichas técnicas y batería estándar/opcional por auto) en `tools/scraper/src/fuentes/sermat-pdf.ts`, con la lista pública de un distribuidor como respaldo en `tools/scraper/src/fuentes/sermat-volta.ts`
- [X] T114 [US5] Crear la planilla manual de Edna con el formato de importación en `tools/scraper/manual/edna.csv` y unificar las tres fuentes en `data/import/productos.csv` y `data/import/compatibilidades.csv`

**Checkpoint**: validaciones 9 y 10 de [quickstart.md](quickstart.md) pasan; planillas iniciales listas para que Juan las revise

---

## Phase 7: User Story 4 — Avisos por mail en cada paso (Priority: P2)

**Goal**: todos los mails del ciclo del pedido, una sola vez, desde el dominio del negocio

**Independent Test**: recorrer un pedido de punta a punta y verificar en Mailpit un mail por cambio de estado al destinatario correcto

### Tests for User Story 4 ⚠️

- [X] T115 [P] [US4] Tests de integración: US4-01 (transferencia → mail con CBU/alias, monto y plazo + aviso al admin con link al panel), US4-02 ("Vamos en camino" con número), US4-03 (ningún mail al comprador contiene el DNI), US4-04 (mailer caído → pedido creado, error registrado, sale al reintentar), US4-05 (evento pagado dos veces → un mail) en `backend/tests/integration/notificaciones/mails.test.ts`

### Implementation for User Story 4

- [X] T116 [US4] Completar el mapa evento → plantillas → destinatarios para todos los estados, alertas, consultas de canje y arrepentimientos en `backend/src/modules/notificaciones/application/eventos.ts`
- [X] T117 [P] [US4] Crear el layout común de mails (número, productos, entrega, total, enlace de seguimiento, botón de WhatsApp, datos del comercio) en `backend/src/modules/notificaciones/plantillas/layout.tsx`
- [X] T118 [US4] Documentar la configuración de SPF, DKIM y DMARC del dominio en Resend y la prueba de reputación ≥ 9/10 (US4-06) en `infra/README.md`

**Checkpoint**: SC-007 verificable

---

## Phase 8: User Story 7 — Legales y cuidado de los datos personales (Priority: P3)

**Goal**: arrepentimiento, anonimización y garantía de que el DNI no sale del panel

**Independent Test**: enviar un arrepentimiento, anonimizar un pedido y buscar el DNI de prueba en respuestas, logs y mails

### Tests for User Story 7 ⚠️

- [X] T119 [P] [US7] Tests de integración: US7-02 (arrepentimiento → código, aviso al admin, registro en el pedido), US7-03 (DNI no legible en la tabla), US7-04 (error forzado en checkout sin DNI ni dirección en logs ni Sentry), US7-06 (anonimizar conserva total, productos y fecha) en `backend/tests/integration/legales/legales.test.ts`
- [X] T120 [P] [US7] Test de contrato que recorre todas las rutas públicas con un pedido de prueba y verifica que el DNI no aparece en ninguna respuesta (SC-012) en `backend/tests/contract/legales/sin-dni.test.ts`

### Implementation for User Story 7

- [X] T121 [P] [US7] Crear el esquema `arrepentimientos` (`pedido_id` null, `numero_pedido`, `nombre`, `email`, `codigo` UNIQUE legible tipo `ARR-7K2Q`) en `backend/src/modules/legales/infrastructure/schema.ts` y generar la migración en `backend/db/migrations/`
- [X] T122 [US7] Implementar el servicio y la ruta `POST /arrepentimiento` (rate limit, vínculo al pedido si el número existe, aviso al admin) y `GET /admin/arrepentimientos` en `backend/src/modules/legales/`
- [X] T123 [US7] Implementar `anonimizar` (reemplaza nombre, DNI, teléfono, mail y dirección; completa `anonimizado_en`) y la ruta `POST /admin/pedidos/:id/anonimizar` en `backend/src/modules/clientes/application/anonimizar.ts`

**Checkpoint**: US7 por API completa (el pie legal y HTTPS se verifican en las fases 9 y 11)

---

## Phase 9: User Story 8 — Operación confiable (Priority: P3, transversal)

**Goal**: staging y producción en el VPS con Docker, deploy seguro, backups y monitoreo

**Independent Test**: deploy a staging desde `develop`, restaurar el backup de ayer en una base nueva, forzar una caída y un test fallido

### Tests for User Story 8 ⚠️

- [ ] T124 [P] [US8] Test de `GET /salud` (200 con base accesible, 503 sin base) en `backend/tests/contract/http/salud.test.ts`

### Implementation for User Story 8

- [ ] T125 [P] [US8] Crear el Dockerfile multi-stage del backend (Node 24 slim, usuario no root, entradas `api` y `worker`) en `backend/Dockerfile`
- [ ] T126 [US8] Crear `infra/docker-compose.yml` con `backend`, `worker`, `db` (PostgreSQL 17 con volumen), `frontend` (perfil desactivado hasta la fase 11), límites de memoria y red interna, parametrizado por `.env` de cada entorno
- [ ] T127 [P] [US8] Crear la configuración de Nginx para producción y staging (proxy `/api` al backend, resto al frontend, HTTP → HTTPS, staging con autenticación básica y `X-Robots-Tag: noindex`) en `infra/nginx/`
- [ ] T128 [US8] Crear `infra/scripts/deploy.sh` (pull de imágenes por etiqueta, migraciones antes de cambiar contenedores, abortar si fallan, rollback a la etiqueta anterior)
- [ ] T129 [US8] Crear `.github/workflows/deploy-staging.yml` (en `develop`) y `deploy-prod.yml` (en `main`): tests, build y push de imágenes a GHCR, deploy por SSH; si algo falla no se publica (US8-02). `deploy-prod.yml` MUST exigir aprobación manual y la prueba de punta a punta en staging en verde (T143, constitución VIII); hasta que exista el frontend, el job de producción queda deshabilitado
- [ ] T130 [P] [US8] Crear `infra/scripts/backup.sh` (pg_dump diario comprimido a R2, retención 30 días) y `infra/scripts/restore.sh`, con el cron del VPS documentado
- [ ] T131 [US8] Documentar en `infra/README.md`: preparación del VPS (Docker, Nginx, certbot, usuario de deploy), variables por entorno, restauración probada (US8-01, < 2 h), monitor UptimeRobot cada 5 min a `/api/v1/salud` (US8-03), acta de entrega de cuentas y guía de soporte (tienda caída, pago no acreditado, mail no recibido, stock desfasado) (US8-04)

**Checkpoint**: staging funcionando con el backend completo y sandbox de Mercado Pago

---

## Phase 10: User Story 6 — Confianza, Google y GEO: datos del backend (Priority: P3)

**Goal**: el backend entrega todo lo que el frontend necesita para SEO local y GEO

**Independent Test**: `GET /seo/indice` y `GET /vehiculos/:marca/:modelo` devuelven slugs, fechas, tabla de medidas por años y preguntas frecuentes

### Tests for User Story 6 ⚠️

- [X] T132 [P] [US6] Tests de contrato: `GET /seo/indice` excluye productos no activos (US6-04); `GET /vehiculos/:marcaSlug/:modeloSlug` incluye medidas por rango de años y preguntas frecuentes cuya primera respuesta es la medida (US6-07); `GET /configuracion/publica` incluye zonas atendidas y datos idénticos del comercio en `backend/tests/contract/seo/seo.test.ts`

### Implementation for User Story 6

- [X] T133 [US6] Implementar `GET /vehiculos/:marcaSlug/:modeloSlug` con medidas por rango de años, productos y preguntas frecuentes generadas desde los datos en `backend/src/modules/compatibilidad/application/pagina-vehiculo.ts`
- [X] T134 [US6] Implementar `GET /seo/indice` (productos activos y modelos con compatibilidad, con fecha de actualización) en `backend/src/modules/catalogo/http/rutas-seo.ts`

**Checkpoint**: backend completo; todas las historias verificables por API

---

## Phase 11: Frontend (bloque posterior, cuando el diseño UX/UI esté cerrado)

**Purpose**: tienda y panel sobre la API ya probada. Estas tareas son el esqueleto; se refinan con
`/speckit-tasks` cuando el diseño esté definido.

- [ ] T135 Inicializar Next.js 16 con Tailwind y TypeScript en `frontend/`, consumiendo `@casa/shared`, y `frontend/Dockerfile`
- [X] T136 Implementar el cliente de la API (desde el servidor por red interna, desde el navegador a `/api/v1`) y `POST /api/revalidate` con secreto en `frontend/src/lib/api.ts` y `frontend/src/app/api/revalidate/route.ts`
- [X] T137 [P] [US1] Portada con buscador, catálogo con filtros en la URL y ficha (375 px, 48 px, 17 px, WCAG AA) en `frontend/src/app/(tienda)/`
- [X] T138 [P] [US2] Carrito, checkout de una página, retorno de Mercado Pago y seguimiento en `frontend/src/app/(tienda)/checkout/` y `frontend/src/app/(tienda)/pedido/[id]/`
- [ ] T139 [P] [US3] Panel: ingreso, pedidos, detalle, confirmaciones y alertas en `frontend/src/app/panel/`
- [ ] T140 [P] [US5] Panel: productos, revisión en lote, fotos, importación, vehículos, configuración, zonas y consultas de canje en `frontend/src/app/panel/`
- [ ] T141 [P] [US6] Quiénes somos, contacto, botón flotante de WhatsApp, páginas `/auto/[marca]/[modelo]` con FAQ, datos estructurados `Product`, `AutoPartsStore` y `FAQPage`, `sitemap.ts`, `robots.ts` (rastreadores de IA permitidos), `llms.txt`, GA4 y Meta Pixel sin datos personales con UTM en `frontend/src/app/`
- [ ] T142 [P] [US7] Pie con legales, datos del comercio y botón de arrepentimiento; páginas legales en `frontend/src/app/(tienda)/legales/`
- [ ] T143 Tests punta a punta con Playwright de la compra completa en staging con sandbox de Mercado Pago, en `frontend/tests/e2e/compra.spec.ts`
- [ ] T144 Auditorías de rendimiento, accesibilidad y SEO ≥ 90 en portada, ficha y página de auto (SC-008)

---

## Phase 12: Polish & Cross-Cutting Concerns

- [X] T145 [P] Revisar que cada escenario de aceptación de la spec tenga su test con el ID en el nombre y listar los que se validan a mano en `specs/001-tienda-online/checklists/cobertura-tests.md`
- [X] T146 [P] Revisión de seguridad: secretos fuera del código, rate limits, cookies, cabeceras (`helmet`), dependencias con `pnpm audit`, en `backend/src/http/server.ts`
- [ ] T147 Ejecutar todas las validaciones de [quickstart.md](quickstart.md) en staging y registrar el resultado
- [X] T148 [P] Actualizar `README.md` de la raíz con cómo levantar el proyecto (enlazando a quickstart) y el mapa de carpetas
- [X] T149 [P] Tests de inyección: cargas típicas de SQL injection (y HTML en mails) en todos los endpoints públicos y en el login; deben responder 400/404 o guardarse como texto literal, nunca 500, nunca demorar ni filtrar datos, en `backend/tests/contract/seguridad/inyeccion.test.ts`
- [ ] T150 Pruebas de carga con k6 contra staging en el VPS (depende de la fase 9): buscador con 100 usuarios simultáneos, ráfaga de compras sobre el mismo producto y ráfaga de avisos de Mercado Pago. Meta: p95 < 500 ms, 0 errores, sin sobreventa; registrar CPU/RAM para decidir si alcanzan los 4 GB. Scripts en `infra/carga/` y resultado en `infra/carga/RESULTADOS.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Fundaciones (2)** → historias.
- **US1 (3)** solo depende de Fundaciones.
- **US2 (4)** depende de US1 (necesita productos, stock y precios).
- **US3 (5)** depende de US2 (necesita pedidos y pagos).
- **US5 (6)** depende de US1; puede ir en paralelo con US2/US3 salvo el contador de `/admin/resumen` (T110 después de T092).
- **US4 (7)** depende de US2 y US3 (eventos de todos los estados).
- **US7 (8)** depende de US2.
- **US8 (9)** depende de Fundaciones; conviene hacerla después de US2 para tener algo que desplegar.
- **US6 backend (10)** depende de US1.
- **Frontend (11)** depende del diseño UX/UI y de las fases de backend de cada historia.
- **Polish (12)** al final.

### Orden acordado (30/10/2026)

Fases 1–7 hechas. Sigue: **8 → 10 → 11 → 9 → 12**. El deploy (9) se hace después del frontend
para configurar Nginx, frontend y backend juntos una sola vez. Consecuencias:

- **Prueba temprana del VPS** apenas el cliente dé acceso, antes de la fase 11 si se puede:
  instalar Docker, medir memoria libre y levantar base y API de prueba. Así se confirma pronto
  si alcanzan los 4 GB.
- **T143** (punta a punta con el sandbox de Mercado Pago) necesita una dirección pública para el
  webhook: se corre en staging después de la fase 9, o en local con un túnel temporal.
- **T147** y **T150** dependen de staging: van con la fase 12, después de la 9.

### Within Each User Story

- Tests primero; tienen que fallar antes de implementar.
- Esquema → migración → dominio → servicios → contratos → rutas.
- Cerrar la historia antes de pasar a la siguiente prioridad.

### Parallel Opportunities

- Setup: T003–T010.
- Fundaciones: tests T011–T016; T018–T022; esquemas T025–T028.
- US1: tests T043–T045; esquemas T046–T047; T049, T050, T054.
- US2: tests T058–T065; esquemas T066–T069; dominio T071–T073; T082.
- US5: tests T096–T099; T100–T102; T109; scraper T111 en paralelo con todo el backend.
- US8: T125, T127, T130 en paralelo.

---

## Parallel Example: User Story 2

```bash
# Tests de US2 en paralelo:
Task: "Tests unitarios de la máquina de estados en backend/tests/unit/pedidos/maquina-estados.test.ts"
Task: "Tests unitarios de importes en backend/tests/unit/pedidos/importes.test.ts"
Task: "Tests de contrato del webhook en backend/tests/contract/pagos/webhook-mercadopago.test.ts"

# Esquemas de US2 en paralelo:
Task: "Esquema de pedidos en backend/src/modules/pedidos/infrastructure/schema.ts"
Task: "Esquema de clientes en backend/src/modules/clientes/infrastructure/schema.ts"
Task: "Esquema de pagos en backend/src/modules/pagos/infrastructure/schema.ts"
```

---

## Implementation Strategy

### MVP del servidor (US1 + US2)

1. Fases 1 y 2.
2. Fase 3 (US1) → validar buscador y catálogo por API.
3. Fase 4 (US2) → validar compra, pagos y vencimientos.
4. **Parar y validar** con el quickstart: el backend ya puede vender.

### Entrega incremental

1. + US3 (panel de pedidos) → el admin confirma transferencias.
2. + US5 (catálogo, importación y scraper) → Juan revisa las planillas.
3. + US4 y US7 → mails completos y legales.
4. + US8 → staging en el VPS; demo a Juan.
5. + US6 backend → datos para SEO y GEO.
6. Frontend cuando el diseño esté cerrado; después, salida a producción.

---

## Notes

- `[P]` = archivos distintos y sin dependencias pendientes.
- Commit por tarea o grupo lógico, con el ID en el mensaje (`feat(pedidos): reserva atómica [T075]`).
- Si el código y la spec no coinciden, se corrige uno de los dos de forma explícita.
