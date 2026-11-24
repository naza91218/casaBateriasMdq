# PLAN TÉCNICO — Tienda propia de La Casa de las Baterías

> * **Estado:** borrador, alineado con la propuesta enviada (USD [monto], 30 días corridos, mantenimiento USD [monto]).
> * **Fecha:** 20/10/2026
> * **Reemplaza a:** la arquitectura WordPress + WooCommerce de `PROCESO_DE_DESARROLLO.md` (§2–§6). Las preguntas de §10 de ese documento siguen vigentes.
> * **Desarrollador:** Nazareno (1 persona)
>
> **Actualización 29/10/2026:** las secciones §2 a §8 quedaron reemplazadas por
> [specs/001-tienda-online/plan.md](specs/001-tienda-online/plan.md) y sus anexos (research,
> data-model, contracts, quickstart). Cambios principales: VPS de HostGator en lugar de Netlify,
> PostgreSQL en el VPS en lugar de Neon, backend como API propia (Fastify) separado del frontend,
> Docker y tres entornos. Este documento se conserva por la §1 y el registro de decisiones (§9).

---

## 1. Requisitos que condicionan el stack

Salen de lo que la propuesta promete por escrito:

| Promesa de la propuesta | Qué exige técnicamente |
| :- | :- |
| Una página por batería y por modelo de auto (Google) | Render en servidor, URLs propias, sitemap, datos estructurados |
| No se vende lo que no hay | Descuento de stock **atómico** al crear el pedido |
| Pagado solo cuando Mercado Pago lo aprueba | Webhook firmado + consulta del pago a la API de MP |
| Si no se paga en 48 h, se cancela solo | Tarea programada que vence pedidos y devuelve stock |
| DNI y dirección solo los ve el dueño | Datos sensibles cifrados, panel con login, nada en el navegador |
| Copias de seguridad todos los días | Backup diario automático fuera del proveedor de la base |
| Partes independientes (catálogo, pedidos, pagos, clientes, entregas) | Monolito modular con límites claros entre módulos |
| Más recursos sin rehacer nada | Stack estándar sin dependencia de una plataforma (Node + PostgreSQL) |
| Mantenimiento USD [monto] y solo dominio como costo de terceros | Infraestructura en **planes gratuitos** que permitan uso comercial |
| Todo queda a nombre del cliente | Cada cuenta creada con el mail del negocio; el dev como colaborador |

---

## 2. Stack

| Capa | Elección | Por qué |
| :- | :- | :- |
| Lenguaje | **TypeScript** (estricto) | Un solo lenguaje en tienda, panel y tareas |
| Framework | **Next.js** (App Router, Server Components, Server Actions) | SSR/ISR para Google, tienda y panel en un solo proyecto, ya lo usás |
| Estilos | **Tailwind CSS** + componentes propios; **shadcn/ui** solo en el panel | Rápido de construir; la tienda lleva la identidad propia |
| Base de datos | **PostgreSQL en Neon** (plan gratuito) | Transacciones para el stock, no se pausa como Supabase free, ramas para pruebas |
| ORM / migraciones | **Drizzle ORM** + `drizzle-kit` | SQL explícito, migraciones versionadas, liviano en serverless |
| Validación | **Zod** | Un esquema por formulario, compartido entre servidor y cliente |
| Pagos | **Mercado Pago Checkout Pro** (SDK `mercadopago`) + webhooks | Tarjetas, dinero en cuenta y cuotas sin manejar datos de tarjeta |
| Mails | **Resend** + **React Email** | Plan gratuito suficiente, plantillas en JSX, dominio propio verificado |
| Login del panel | **Auth.js** con enlace por mail (Resend) | Mateo no tiene que recordar contraseña; un solo usuario, preparado para sumar roles |
| Imágenes y backups | **Cloudflare R2** | Gratis hasta 10 GB y sin costo de salida; API S3 estándar |
| Hosting | **Netlify** (plan gratuito, uso comercial permitido) | Deploy por push, previews, funciones programadas para el vencimiento de pedidos |
| Tareas programadas | **Netlify Scheduled Functions** (cada hora) | Vencer pedidos a las 48 h |
| Backup diario | **GitHub Actions** (cron) → `pg_dump` → R2, 30 días de retención | Copia fuera de Neon, restaurable |
| Errores y disponibilidad | **Sentry** (free) + **UptimeRobot** o Better Stack (free) | El "monitoreo" del mantenimiento |
| Métricas | **Google Analytics 4**, **Meta Pixel**, Google Search Console | Lo prometido para campañas y Google |
| Tests | **Vitest** (servicios) + **Playwright** (compra de punta a punta en sandbox) | Lo que se rompe caro es la compra |
| Repositorio y CI | **GitHub** + Actions (lint, typecheck, tests, migraciones) | Repo a nombre del cliente o transferible |

**Costo mensual de infraestructura: USD 0** dentro de los planes gratuitos. Revisar los límites vigentes de Netlify, Neon, Resend y R2 al crear las cuentas.

**Cómo escala sin rehacer:** Neon y Netlify tienen planes pagos con un clic. Si algún día conviene un servidor propio, es un Next.js + PostgreSQL estándar que corre en Docker en cualquier VPS.

### Descartado

| Opción | Motivo |
| :- | :- |
| WordPress + WooCommerce | La propuesta vende una tienda propia; el buscador y el checkout con DNI pelean contra la plataforma |
| Vercel | El plan gratuito no permite uso comercial (D5) |
| Supabase free | Pausa el proyecto tras una semana sin actividad |
| Base de datos en el mismo VPS | Sumaría costo mensual y backups manuales |

---

## 3. Arquitectura

```text
Comprador ──► Next.js en Netlify ──► PostgreSQL (Neon)
               │  tienda pública (SSR/ISR)
               │  panel /panel (Auth.js)
               │  /api/webhooks/mercadopago ◄── Mercado Pago
               │  función programada (vence pedidos)
               ├──► Resend (mails)
               └──► R2 (fotos)
GitHub Actions ── pg_dump diario ──► R2 (backups)
```

### 3.1 Módulos

```text
src/
  app/                  rutas: (tienda), panel/, api/
  modules/
    catalogo/           productos, marcas, gamas, fotos
    compatibilidad/     vehículos y qué medida lleva cada uno
    pedidos/            crear, reservar stock, estados, vencimiento
    pagos/              Mercado Pago, transferencia, efectivo
    clientes/           datos del comprador (DNI cifrado)
    entregas/           colocación a domicilio, retiro, zonas
    notificaciones/     mails por cada cambio de estado
    configuracion/      descuento, datos bancarios, horarios, WhatsApp
  db/                   esquema Drizzle y migraciones
  lib/                  auth, cifrado, R2, utilidades
```

Reglas:

1. Cada módulo expone **servicios** (`crearPedido`, `confirmarTransferencia`…). Las pantallas y las server actions llaman servicios, nunca a la base directamente.
2. Un módulo no toca las tablas de otro: le pide a su servicio.
3. Los cambios de estado de un pedido pasan por **una sola función** (`cambiarEstado`), que valida la transición, registra el evento y dispara el mail.
4. Todo secreto vive en variables de entorno de servidor. Ninguna lleva prefijo `NEXT_PUBLIC_` salvo los IDs públicos de Analytics y Pixel.

---

## 4. Modelo de datos

| Tabla | Campos principales |
| :- | :- |
| `productos` | id, sku, slug, marca, medida (12x65…), amperaje, cca, gama (`economica`/`reforzada`), descripción, precio_lista, precio_con_canje, stock, activo |
| `producto_fotos` | producto_id, url (R2), orden |
| `vehiculos` | id, slug, marca, modelo, año_desde, año_hasta, motor (opcional) |
| `compatibilidades` | vehiculo_id, medida (o producto_id) |
| `pedidos` | id, número, estado, método_entrega, método_pago, subtotal, descuento, total, expira_en, creado_en |
| `pedido_items` | pedido_id, producto_id, cantidad, precio_unitario, con_canje |
| `pedido_clientes` | pedido_id, nombre, **dni_cifrado**, teléfono, mail, dirección, notas |
| `pagos` | pedido_id, proveedor, id_externo (MP), estado, monto, payload |
| `pedido_eventos` | pedido_id, de, a, quién, cuándo (auditoría) |
| `zonas_colocacion` | nombre, costo_extra, activa |
| `configuracion` | descuento_transferencia_%, datos bancarios, horarios, WhatsApp, horas_vencimiento |

**Compatibilidad por medida, no por producto:** el auto lleva una medida (12x65) y la tienda muestra todos los productos activos de esa medida (económica y reforzada). Así, sumar una marca nueva no obliga a recargar compatibilidades.

### 4.1 Estados del pedido

```text
pendiente_pago ──(MP aprueba / Mateo confirma transferencia)──► pagado
pendiente_pago ──(48 h sin pago)──► cancelado (devuelve stock)
a_pagar_en_local ──(retira y paga)──► entregado
pagado ──► en_camino ──► entregado        (colocación a domicilio)
pagado ──► listo_para_retirar ──► entregado   (retiro en el local)
```

### 4.2 Stock sin sobreventa

Dentro de una transacción, por cada ítem:

```sql
UPDATE productos SET stock = stock - $cantidad
WHERE id = $id AND activo AND stock >= $cantidad
RETURNING stock;
```

Si alguna fila no se actualiza, se hace rollback y el comprador ve "sin stock". El vencimiento a las 48 h y la cancelación hacen el `UPDATE` inverso en la misma transacción que el cambio de estado.

### 4.3 Mercado Pago

1. Al elegir MP se crea la preferencia con `external_reference = pedido.id` y `notification_url = /api/webhooks/mercadopago`.
2. El webhook valida la firma (`x-signature`), **consulta el pago a la API de MP** y recién ahí marca `pagado`. Nunca se confía en el redirect del navegador.
3. Idempotente: el mismo `payment_id` procesado dos veces no cambia nada.

### 4.4 Datos personales (Ley 25.326)

* DNI cifrado con AES-256-GCM (clave en variable de entorno); se descifra solo en el panel.
* El checkout explica para qué se pide cada dato.
* Política de privacidad, términos, botón de arrepentimiento y datos del comercio en el pie.

---

## 5. Rutas

| Ruta | Contenido |
| :- | :- |
| `/` | Buscador por auto, gamas, servicio (colocación, alternador, garantía), confianza, WhatsApp |
| `/auto/[marca]/[modelo]` | Baterías compatibles (página indexable por cada modelo) |
| `/baterias` | Catálogo con filtros (marca, medida, gama) |
| `/baterias/[slug]` | Ficha con fotos, especificaciones, autos compatibles, con o sin canje |
| `/carrito`, `/checkout` | Datos, entrega (domicilio o retiro), pago |
| `/pedido/[id]?t=token` | Estado del pedido; datos bancarios si es transferencia |
| `/quienes-somos`, `/contacto` | Historia, equipo, mapa, horarios |
| `/legales/*`, `/arrepentimiento` | Términos, privacidad, botón de arrepentimiento |
| `/panel/*` | Pedidos, productos, vehículos, configuración |
| `sitemap.xml`, `robots.txt` | Generados desde la base |

---

## 6. Paso a paso

Formato `T<semana>.<n>`, con **Hecho cuando** verificable. Coincide con las 4 semanas de la propuesta.

### Semana 0 — Antes de arrancar (al confirmar)

| Tarea | Descripción | Hecho cuando |
| :- | :- | :- |
| T0.1 | Cobrar el 50 % y recibir el catálogo de proveedores | Pago acreditado y catálogo en mano |
| T0.2 | Registrar el dominio `.com.ar` en NIC Argentina a nombre del negocio (o el tuyo, con transferencia al cierre) | El dominio figura registrado |
| T0.3 | Crear con el mail del negocio: GitHub, Netlify, Neon, Resend, Cloudflare (R2 y DNS), Mercado Pago Developers, Sentry; vos como colaborador | Tenés acceso a todas y el cliente es dueño |

### Semana 1 — Arranque y diseño

| Tarea | Descripción | Hecho cuando |
| :- | :- | :- |
| T1.1 | Repo Next.js + TypeScript + Tailwind + Drizzle; ESLint, Prettier, Vitest; CI en GitHub Actions | Un push a `main` corre lint, typecheck y tests y despliega en Netlify |
| T1.2 | DNS en Cloudflare apuntando a Netlify, HTTPS, dominio verificado en Resend (SPF, DKIM, DMARC) | El sitio abre por HTTPS en el dominio y un mail de prueba llega sin spam |
| T1.3 | Esquema de base completo (§4) y primera migración en Neon (ramas `main` y `dev`) | Las tablas existen en ambas ramas |
| T1.4 | Backup diario: Action con `pg_dump` → R2, y **prueba de restauración** | Un backup se restaura en una rama nueva de Neon |
| T1.5 | Definir categorías, gamas, canje y zonas con Mateo (§10 de la propuesta) | Respuestas anotadas en el registro de decisiones |
| T1.6 | Diseño de portada y ficha de producto (identidad del logo elegido, Bricolage, negro/verde) | Mateo aprueba el diseño por escrito |

### Semana 2 — Catálogo y buscador

| Tarea | Descripción | Hecho cuando |
| :- | :- | :- |
| T2.1 | Planilla modelo (CSV/Google Sheets) + script de importación con validación Zod e informe de errores | Se importan los productos del proveedor; las filas con error se listan sin cortar la carga |
| T2.2 | Tabla de compatibilidades auto → medida (catálogo del proveedor) e importación | Los modelos del catálogo quedan cargados con su medida |
| T2.3 | Buscador marca → modelo → año, con botón a WhatsApp si no aparece | Elegir un auto muestra solo las baterías de su medida; uno inexistente ofrece WhatsApp con el auto precargado |
| T2.4 | Catálogo con filtros, ficha con fotos (R2 + `next/image`), explicación económica vs reforzada | Filtrar por medida y gama funciona en el celular |
| T2.5 | SEO: `generateMetadata`, JSON-LD `Product`, `sitemap.ts`, páginas `/auto/...` con ISR | Search Console acepta el sitemap y la prueba de resultados enriquecidos pasa |

### Semana 3 — Compra, pagos y panel

| Tarea | Descripción | Hecho cuando |
| :- | :- | :- |
| T3.1 | Carrito y checkout como invitado: datos con explicación, colocación o retiro, zona | El formulario valida DNI, teléfono y dirección y se completa en menos de 2 minutos en el celular |
| T3.2 | `crearPedido` con reserva atómica de stock (§4.2) | Test: dos compras simultáneas de la última unidad, solo una pasa |
| T3.3 | Mercado Pago Checkout Pro en sandbox + webhook firmado e idempotente | Pago aprobado → `pagado`; rechazado → sigue pendiente; webhook repetido no duplica |
| T3.4 | Transferencia con descuento (datos bancarios en el mail y en `/pedido`) y efectivo solo con retiro | Efectivo no aparece si se elige colocación |
| T3.5 | Vencimiento a las 48 h (función programada cada hora) | Un pedido vencido pasa a `cancelado` y el stock vuelve |
| T3.6 | Mails con React Email: recibido, pagado, en camino / listo para retirar, entregado (comprador y comercio) | Cada cambio de estado envía su mail |
| T3.7 | Panel: login por enlace, pedidos (detalle, mapa, confirmar transferencia, cambiar estado), productos (precio, stock, pausa, fotos), configuración | Mateo hace todo el recorrido de §5 de la propuesta desde el celular |

### Semana 4 — Últimos detalles y salida

| Tarea | Descripción | Hecho cuando |
| :- | :- | :- |
| T4.1 | Quiénes somos, contacto con mapa, botón de WhatsApp global | Las páginas tienen los textos y fotos de Mateo |
| T4.2 | Legales: términos, privacidad, arrepentimiento, datos del comercio (razón social, CUIT) | Enlazados en el pie con datos reales |
| T4.3 | GA4, Meta Pixel (eventos `ViewContent`, `AddToCart`, `Purchase`), Search Console, perfil de Google Business enlazado | Los eventos aparecen en las herramientas |
| T4.4 | Sentry y monitor de disponibilidad con aviso por mail | Un error forzado llega a Sentry; el monitor avisa si el sitio cae |
| T4.5 | Prueba de punta a punta con Playwright en sandbox + checklist manual (§7) | Todo pasa en celular y compu |
| T4.6 | Mercado Pago a producción y **compra real** de bajo monto | Se acredita, cambia el estado, llegan los mails; se reintegra |
| T4.7 | Guía con capturas + capacitación; entrega de accesos; cobro del 50 % restante | Mateo gestiona un pedido y edita un producto sin ayuda; confirma la entrega por escrito |

Al final de cada semana: demo a Mateo en el deploy de preview.

---

## 7. Checklist de salida

- [ ] Buscar un auto → elegir batería → pagar con MP → `pagado`, stock descontado, mails a ambos.
- [ ] Pago rechazado → no queda pagado ni descuenta de más.
- [ ] Transferencia → `pendiente_pago` → confirmar en el panel → `pagado`.
- [ ] Pedido sin pagar 48 h → `cancelado` y stock devuelto.
- [ ] Efectivo solo con retiro.
- [ ] Producto sin stock no se puede comprar; dos compras simultáneas no venden de más.
- [ ] El DNI no aparece en ninguna respuesta pública ni en el HTML.
- [ ] Botón de arrepentimiento llega al comercio.
- [ ] Lighthouse móvil ≥ 90 en inicio, ficha y búsqueda por auto.
- [ ] Backup del día existe y se restauró al menos una vez.

---

## 8. Variables de entorno

| Variable | Uso |
| :- | :- |
| `DATABASE_URL` | Neon (pooler) |
| `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` | Mercado Pago |
| `RESEND_API_KEY`, `MAIL_FROM` | Mails |
| `AUTH_SECRET`, `ADMIN_EMAIL` | Login del panel |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | Fotos |
| `DNI_ENCRYPTION_KEY` | Cifrado de DNI (32 bytes, base64) |
| `SENTRY_DSN` | Errores |
| `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_META_PIXEL_ID` | Únicas públicas |

---

## 9. Registro de decisiones

| # | Fecha | Decisión | Motivo |
| :- | :- | :- | :- |
| D8 | 20/10/2026 | Tienda propia en Next.js + PostgreSQL, en lugar de WooCommerce (reemplaza D2–D4) | Propuesta aceptada a medida: buscador, checkout con DNI, propiedad total |
| D9 | 20/10/2026 | Neon + Netlify + R2 + Resend en planes gratuitos | El mantenimiento de USD [monto] no cubre hosting pago |
| D10 | 20/10/2026 | Compatibilidad por medida (auto → 12x65) | Menos datos que mantener; sumar marcas no rompe el buscador |
| D11 | 20/10/2026 | Stock descontado al crear el pedido, devuelto al vencer | Promesa "no se vende lo que no hay" |
| D12 | 20/10/2026 | Login del panel por enlace al mail | Un solo usuario, sin contraseñas que olvidar |
| D13 | 28/10/2026 | Hosting en VPS de HostGator a cargo del cliente (reemplaza Netlify de D9) | Pedido del usuario y del cliente |
| D14 | 28/10/2026 | Transferencia y efectivo se confirman a mano en el panel, con usuario y fecha | No hay forma de verificar una transferencia automáticamente |
| D15 | 28/10/2026 | Una sola spec para todo el sistema con spec-kit | Pedido del usuario: visión completa y un solo `tasks.md` |
| D16 | 29/10/2026 | PostgreSQL en el VPS (reemplaza Neon de D9) | El VPS ya se paga; un servicio menos |
| D17 | 29/10/2026 | Repo con `frontend/`, `backend/` (API REST propia en Fastify) y `shared/` | Pedido del usuario; API reutilizable |
| D18 | 29/10/2026 | Docker y tres entornos (dev, staging, prod) | Entornos iguales, aislados y con rollback |
| D19 | 29/10/2026 | Catálogo inicial scrapeado de fuentes públicas, todo entra "a revisar" | Los proveedores no pasan catálogo |
| D20 | 29/10/2026 | Canje solo por consulta (formulario + WhatsApp), valuado en el local | Definido en el clarify |
| D21 | 29/10/2026 | Reserva: MP 30 min (solo medios instantáneos), transferencia 48 h, efectivo sin vencimiento | Definido en el clarify |
| D22 | 29/10/2026 | Enlace mágico propio en el backend en lugar de Auth.js | Con la API separada, el login vive en el backend (constitución v1.4.0) |
| D23 | 29/10/2026 | Backend primero; frontend cuando se cierre el diseño UX/UI | Pedido del usuario |
