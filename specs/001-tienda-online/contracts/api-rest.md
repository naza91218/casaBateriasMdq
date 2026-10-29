# Contrato: API REST del backend

**Base:** `/api/v1` (mismo dominio que la tienda, vía Nginx). JSON UTF-8. Importes en
**centavos enteros**. Fechas ISO 8601 UTC.

La fuente de verdad son los esquemas Zod de `shared/src/contratos/`; el backend publica la
especificación OpenAPI generada en `/api/v1/docs` (solo desarrollo y staging). Este documento fija
los recursos, las reglas y los códigos; los nombres de campos detallados viven en los esquemas.

## Convenciones

- **Errores:** `{ "error": { "codigo": "STOCK_INSUFICIENTE", "mensaje": "Se agotó mientras
  comprabas", "campos": { "dni": "El DNI tiene solo números, sin puntos" } } }`. El `mensaje`
  está listo para mostrar al comprador (voseo, sin tecnicismos).
- **Códigos HTTP:** 200/201 éxito · 400 validación · 401 sin sesión · 403 sin permiso · 404 no
  existe o no visible · 409 conflicto de estado o stock · 422 regla de negocio · 429 rate limit.
- **Nunca** se devuelven DNI, dirección ni teléfono en rutas públicas (FR-059). Solo
  `GET /admin/pedidos/:id` devuelve el DNI descifrado.
- **Paginación:** `?pagina=1&porPagina=24` → `{ items, total, pagina, porPagina }`.
- **Rate limit:** checkout, consultas, arrepentimiento y `auth/enlace` limitados por IP.

## Público — catálogo y buscador (US1)

| Método y ruta | Qué hace | Requisitos |
| :- | :- | :- |
| `GET /catalogo/marcas` | Marcas activas | FR-002 |
| `GET /catalogo/medidas` | Medidas ordenadas | FR-003 |
| `GET /catalogo/productos?marca&medida&gama&pagina` | Productos `activo`, con precio de lista, precio por transferencia/efectivo, foto principal, `disponible` | FR-005, FR-008 |
| `GET /catalogo/productos/:slug` | Ficha completa: fotos, especificaciones, precios, autos compatibles, servicio incluido. 404 si no está `activo` | FR-006, FR-007, FR-008 |
| `GET /vehiculos/marcas` | Marcas de autos con datos | FR-010 |
| `GET /vehiculos/modelos?marca=` | Modelos de la marca | FR-010 |
| `GET /vehiculos/anios?marca=&modelo=` | Años disponibles | FR-010 |
| `GET /vehiculos/compatibles?marca=&modelo=&anio=` | `{ vehiculo, medidas, grupos: [{gama, productos}], sinResultados: null \| "auto_no_cargado" \| "sin_stock", whatsapp: { url, mensaje } }` | FR-011, FR-012 |
| `GET /vehiculos/:marcaSlug/:modeloSlug` | Datos de la página de auto: medidas por rango de años, productos, preguntas frecuentes | FR-053, FR-072 |
| `GET /configuracion/publica` | Descuento, WhatsApp, horarios, datos del comercio, zonas activas, URL de reseñas | FR-047, FR-057, FR-073 |
| `GET /seo/indice` | Slugs de productos activos y modelos con compatibilidad, con fecha de actualización (para sitemap y `llms.txt`) | FR-055, FR-074 |

## Público — compra y seguimiento (US2)

| Método y ruta | Qué hace | Requisitos |
| :- | :- | :- |
| `POST /checkout/cotizar` | Body: `items[{productoId, cantidad}]`, `entrega`, `zonaId?`, `medioPago`. Devuelve importes calculados y medios de pago disponibles (sin efectivo si hay colocación) | FR-019, FR-022, FR-023 |
| `POST /pedidos` | Body: lo de cotizar + `comprador{nombre, dni, telefono, email, calle?, numero?, referencias?}`. Crea el pedido y reserva stock en una transacción. 201 → `{ id, numero, urlSeguimiento, pago: { tipo: "mercadopago", initPoint } \| { tipo: "transferencia", banco, monto, venceEn } \| { tipo: "efectivo" } }`. 409 `STOCK_INSUFICIENTE` con el producto que falta | FR-015 a FR-021, FR-027 |
| `GET /pedidos/:id?t=token` | Seguimiento: número, estado, ítems, entrega, totales, datos bancarios si corresponde, `pagoEnVerificacion` si volvió de MP sin confirmar. 404 si el token no coincide | FR-021, US2-08, US2-13, US2-14 |
| `POST /pedidos/:id/reintentar-pago?t=token` | Nueva preferencia de MP si el pedido sigue pendiente y no venció | FR-026 |
| `POST /consultas-canje` | Guarda la consulta y devuelve `{ whatsapp: { url, mensaje } }` | FR-004 |
| `POST /arrepentimiento` | Body: `numeroPedido, nombre, email`. Devuelve `{ codigo }` | FR-058 |

## Webhook

| Método y ruta | Qué hace |
| :- | :- |
| `POST /webhooks/mercadopago` | Ver [webhook-mercadopago.md](webhook-mercadopago.md) |

## Sesión del panel (US3)

| Método y ruta | Qué hace | Requisitos |
| :- | :- | :- |
| `POST /auth/enlace` | Body `{ email }`. Siempre 202 con el mismo cuerpo; solo envía el mail si el usuario existe y está activo | FR-041, US3-02 |
| `GET /auth/verificar?token=` | Valida el enlace (15 min, un uso), crea sesión, setea cookie y redirige a `/panel`. Vencido → redirige a `/panel/ingresar?error=enlace_vencido` | FR-041 |
| `GET /auth/sesion` | Usuario actual o 401 | |
| `POST /auth/salir` | Revoca la sesión | FR-041 |

## Panel — requiere sesión (US3, US5, US7)

Prefijo `/admin`. Toda mutación registra el usuario que la hizo.

| Método y ruta | Qué hace | Requisitos |
| :- | :- | :- |
| `GET /admin/resumen` | Pedidos nuevos, productos a revisar, alertas abiertas, consultas de canje pendientes | FR-043, FR-070 |
| `GET /admin/pedidos?estado&pagina` | Lista, nuevos primero; incluye antigüedad en días para `a_pagar_en_local` | FR-043, FR-034 |
| `GET /admin/pedidos/:id` | Detalle con comprador (DNI descifrado), pagos, eventos, alertas, `transicionesPermitidas`, links a mapa y WhatsApp | FR-043 |
| `POST /admin/pedidos/:id/confirmar-transferencia` | `pendiente_pago` (transferencia) → `pagado`; registra pago manual | FR-028, FR-044 |
| `POST /admin/pedidos/:id/registrar-efectivo` | `a_pagar_en_local` → `entregado`; registra pago manual | FR-029, FR-044 |
| `POST /admin/pedidos/:id/estado` | Body `{ a, motivo? }`. 409 si la transición no es válida | FR-032, FR-033, FR-044 |
| `POST /admin/pedidos/:id/anonimizar` | Reemplaza datos personales | FR-061 |
| `GET /admin/alertas` · `POST /admin/alertas/:id/resolver` | Alertas de pago | FR-031 |
| `GET /admin/productos?q&estado&marca&pagina` | Listado con búsqueda | FR-045 |
| `POST /admin/productos` · `PATCH /admin/productos/:id` | Alta y edición (precio, stock, estado, datos). Activar exige precio y foto | FR-045 |
| `POST /admin/productos/revision` | Body `{ ids, accion: "habilitar" \| "eliminar" }`. Informe por id | FR-070 |
| `DELETE /admin/productos/:id` | Borra o archiva según tenga pedidos | FR-071 |
| `POST /admin/productos/:id/fotos` (multipart) · `PATCH .../fotos/orden` · `DELETE .../fotos/:fotoId` | Fotos | FR-045 |
| `POST /admin/importaciones` (multipart, `tipo=productos\|compatibilidades`) | Ver [importacion-csv.md](importacion-csv.md). Devuelve el informe | FR-046 |
| `GET /admin/vehiculos?q` · `POST` · `PATCH /:id` · `DELETE /:id` | Vehículos y sus medidas | FR-048 |
| `GET /admin/configuracion` · `PATCH /admin/configuracion` | Descuento, banco, horarios, WhatsApp, comercio, reseñas | FR-047 |
| `GET/POST/PATCH /admin/zonas` | Zonas de colocación | FR-017, FR-047 |
| `GET /admin/consultas-canje?estado&formato=csv` · `PATCH /:id` | Lista y descarga | FR-004b |
| `GET /admin/arrepentimientos` | Solicitudes | FR-058 |

## Operación

| Método y ruta | Qué hace |
| :- | :- |
| `GET /salud` | 200 si responde y la base está accesible (monitor externo, FR-063) |
| `GET /docs` | OpenAPI (solo desarrollo y staging) |

## Llamadas salientes hacia el frontend

| Llamada | Contrato |
| :- | :- |
| `POST {FRONTEND_URL}/api/revalidate` | Header `x-revalidate-secret`. Body `{ etiquetas: ["producto:<slug>", "catalogo", "vehiculo:<marca>/<modelo>"] }`. El backend la llama después de cambiar precio, stock, estado, fotos, compatibilidades o configuración pública. Si falla se reintenta por outbox; las páginas además revalidan cada 1 h por las dudas |
