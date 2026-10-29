<!--
Sync Impact Report
- Version change: 1.3.0 → 1.4.0 (MINOR: stack del backend con Fastify y enlace mágico propio en
  lugar de Auth.js. 1.3.0: PostgreSQL en VPS, frontend/backend, tres entornos. 1.2.0: VPS.
  1.1.0: confirmación manual de pagos. 1.0.1: plazo 30 días)
- Origen: specs/constitucion.md (13 reglas, 25/10/2026), agrupadas en 8 principios
- Modified principles: ninguno (primera versión)
- Added sections: Core Principles (I–VIII), Restricciones técnicas y de costo,
  Flujo de desarrollo, Governance
- Removed sections: ninguna
- Templates: plan-template.md resuelve el "Constitution Check" en tiempo de ejecución; sin cambios
- Follow-up TODOs: ninguno. specs/constitucion.md queda como versión anterior (ver Governance)
-->

# La Casa de las Baterías — Tienda online Constitution

## Core Principles

### I. Compra simple, sin cuenta y celular primero

- El comprador MUST poder comprar como invitado, sin crear cuenta, en pocos pasos.
- Cada pantalla MUST diseñarse y probarse primero a 375 px de ancho.
- La interfaz MUST usar texto de 17 px como mínimo, áreas táctiles de 48 px o más, contraste
  WCAG AA y un dato por campo, explicando por qué se pide.

Razón: el comprador típico es alguien grande, que usa poco internet y compra desde el celular,
muchas veces con urgencia.

### II. El servicio es el diferencial

- La colocación incluida, la medición del alternador y los 12 meses de garantía MUST verse en la
  portada, en cada ficha de producto y en el checkout.
- El comprador MUST NOT necesitar saber medidas: el buscador por auto (marca → modelo → año)
  lleva a las baterías compatibles.

Razón: la tienda compite por confianza y servicio, no por precio, con competencia a una cuadra.

### III. Nunca un callejón sin salida

- Si un auto no aparece, si no hay stock o si algo falla, la pantalla MUST ofrecer un botón a
  WhatsApp con el contexto precargado (auto, producto o pedido).

Razón: un cliente que no encuentra salida se va al local de al lado.

### IV. Alcance cerrado por la propuesta

- Lo prometido en la propuesta aceptada es alcance; lo que no está, no.
- Las funciones de "Preparada para crecer" (turnos, beneficio para clientes, ARCA, reportes)
  MUST NOT implementarse hasta que se coticen y se anote la decisión.

Razón: 1 desarrollador, 30 días corridos y presupuesto cerrado (USD [monto]).

### V. Dinero y stock confiables (NON-NEGOTIABLE)

- El stock MUST descontarse de forma atómica al crear el pedido y devolverse al cancelarlo o al
  vencer. No se vende lo que no hay.
- Un pedido MUST figurar como pagado solo con pago confirmado:
  - Mercado Pago: cuando lo aprueba, consultado a su API (no alcanza con el webhook ni con el
    regreso del navegador).
  - Transferencia: cuando el administrador o la persona a cargo la verifica en la cuenta
    bancaria y la confirma desde el panel. No hay forma de verificarla automáticamente, así que
    el sistema MUST NOT marcarla como pagada por ningún otro medio (comprobante subido, aviso
    del comprador, etc.).
  - Efectivo: cuando el administrador lo registra al momento del retiro.
  - Toda confirmación manual MUST registrar quién la hizo y cuándo.
- Los importes MUST calcularse en el servidor, en centavos enteros. El navegador MUST NOT
  enviar precios.

Razón: un error de cobro o de stock rompe la confianza que la tienda vende.

### VI. Datos personales protegidos

- El DNI MUST guardarse cifrado y verse solo en el panel.
- Los datos personales MUST NOT aparecer en URLs, logs, analytics ni en mails al comprador.

Razón: los datos son del comprador; la ley de datos personales y la confianza lo exigen.

### VII. Monolito modular con estados centralizados

- Cada módulo (catálogo, compatibilidad, pedidos, pagos, clientes, entregas, notificaciones,
  configuración) MUST exponer servicios; ningún módulo toca las tablas de otro.
- Todo cambio de estado de un pedido MUST pasar por una sola función que valida la transición
  y registra el evento.

Razón: un solo proyecto fácil de mantener, que pueda crecer sin rehacerse.

### VIII. Cada criterio de aceptación tiene un test

- Cada criterio de aceptación (CA-) de una spec MUST tener al menos un test que lo verifique.
- La compra completa MUST probarse de punta a punta (Playwright, sandbox de Mercado Pago) antes
  de cada salida a producción.

Razón: lo que se rompe caro es la compra.

## Restricciones técnicas y de costo

- Stack: TypeScript estricto. Backend: Node.js + Fastify, PostgreSQL (en el mismo VPS), Drizzle
  ORM, Zod, Mercado Pago Checkout Pro, Resend + React Email, ingreso al panel por enlace mágico
  propio. Frontend: Next.js (App Router), Tailwind CSS (shadcn/ui solo en el panel). Cloudflare
  R2, Sentry, Vitest y Playwright (detalle en `specs/001-tienda-online/plan.md`).
- Hosting: VPS de HostGator, contratado y pagado por el cliente, con PostgreSQL en el mismo
  servidor, detrás de Nginx con HTTPS. Las tareas programadas (vencer pedidos, mails) MUST
  correr en el propio VPS y las copias de la base MUST guardarse fuera de él.
- Estructura: el repositorio MUST dividirse en `frontend/` (Next.js: tienda y panel),
  `backend/` (API REST propia en Node: dominio, datos, pagos, mails y tareas) y `shared/`
  (contratos Zod). El frontend MUST NOT acceder a la base ni a los secretos: todo pasa por la API.
- Entornos: MUST existir desarrollo (local), pruebas (staging) y producción, cada uno con su
  base, sus credenciales y Mercado Pago en modo prueba fuera de producción.
- Fuera del VPS y el dominio, los servicios de terceros MUST mantenerse en planes gratuitos, y
  todas las cuentas MUST quedar a nombre del negocio.
- La identidad visual MUST seguir `DESIGN.md` y `DISENO_UI.md`: colores `#FF2610`, `#FF4E10`,
  negro y blanco; Sport Headline para titulares y Montserrat para el resto.
- Los textos MUST usar voseo rioplatense, frases cortas y sin tecnicismos.

## Flujo de desarrollo

- Cada funcionalidad vive en `specs/NNN-nombre/` con `spec.md` (requisitos R- y criterios CA-),
  y sigue el orden de spec-kit: specify → clarify (si hay dudas) → plan → tasks → analyze →
  implement.
- Cada `plan.md` MUST incluir el Constitution Check y justificar cualquier excepción en su tabla
  de complejidad.
- Antes de salir a producción: lint, typecheck, tests y la compra de punta a punta en verde,
  y el checklist de salida de `PLAN_TECNICO.md` §7 completo.

## Governance

- Esta constitución prevalece sobre specs, planes, tareas y atajos.
- Cambiar un principio MUST anotarse como decisión en `PLAN_TECNICO.md` §9 y subir la versión:
  MAJOR si se quita o redefine un principio, MINOR si se agrega o amplía uno, PATCH para
  aclaraciones de redacción.
- `docs/specs-previas/constitucion.md` es la versión anterior a spec-kit; esta es la fuente de verdad.
- Cada plan y cada revisión de código MUST verificar el cumplimiento de estos principios.

**Version**: 1.4.0 | **Ratified**: 2026-10-25 | **Last Amended**: 2026-10-29
