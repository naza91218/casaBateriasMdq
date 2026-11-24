# Tareas y trazabilidad

Cada tarea de [PLAN_TECNICO.md](../../PLAN_TECNICO.md) §6 con los requisitos que cumple y los criterios que la cierran. Una tarea está **hecha** cuando todos sus criterios pasan.

Estados: `pendiente` · `en curso` · `hecha` · `bloqueada (P#)`

## Semana 0 — Antes de arrancar

| Tarea | Descripción | Requisitos | Criterios | Estado |
| :- | :- | :- | :- | :- |
| T0.1 | Cobro del 50 % y catálogo de proveedores | — | — | pendiente |
| T0.2 | Dominio `.com.ar` | R-OPS-09 | — | pendiente |
| T0.3 | Cuentas a nombre del negocio | R-OPS-09 | CA-OPS-06 | pendiente |

## Semana 1 — Arranque y diseño

| Tarea | Descripción | Requisitos | Criterios | Estado |
| :- | :- | :- | :- | :- |
| T1.1 | Repo, CI y deploy | R-OPS-06, R-OPS-07 | CA-OPS-04 | pendiente |
| T1.2 | DNS, HTTPS, dominio de mails | R-LEG-07, R-NOT-06 | CA-LEG-05, CA-NOT-06 | pendiente |
| T1.3 | Esquema de base y migraciones | R-CAT-01, R-BUS-01, R-BUS-02, R-PED-07, R-PED-08 | — | pendiente |
| T1.4 | Backup diario y restauración | R-OPS-02, R-OPS-03 | CA-OPS-03 | pendiente |
| T1.5 | Definiciones con Mateo | — | — | bloqueada (P1, P4, P8) |
| T1.6 | Diseño de portada y ficha | R-SEO-01, R-CAT-06 | CA-SEO-01 | pendiente |

## Semana 2 — Catálogo y buscador

| Tarea | Descripción | Requisitos | Criterios | Estado |
| :- | :- | :- | :- | :- |
| T2.1 | Planilla e importación de productos | R-CAT-02, R-CAT-03, R-CAT-09 | CA-CAT-04, CA-CAT-05 | pendiente |
| T2.2 | Importación de compatibilidades | R-BUS-09 | — | bloqueada (P4) |
| T2.3 | Buscador marca → modelo → año | R-BUS-03..08 | CA-BUS-01..06 | pendiente |
| T2.4 | Catálogo, filtros y ficha | R-CAT-04..08 | CA-CAT-01..03, CA-CAT-06 | pendiente |
| T2.5 | SEO técnico | R-SEO-05..08 | CA-SEO-02..04 | pendiente |

## Semana 3 — Compra, pagos y panel

| Tarea | Descripción | Requisitos | Criterios | Estado |
| :- | :- | :- | :- | :- |
| T3.1 | Carrito y checkout | R-PED-01, R-PED-04, R-PED-06, R-ENT-01..03, R-LEG-04 | CA-PED-01, CA-PED-02, CA-PED-09 | pendiente |
| T3.2 | Crear pedido con reserva de stock | R-PED-02, R-PED-03, R-PED-05, R-PED-07, R-PED-10 | CA-PED-03..08 | pendiente |
| T3.3 | Mercado Pago | R-PAG-03..06, R-PAG-09 | CA-PAG-03..08 | bloqueada (Q-PAG-02) |
| T3.4 | Transferencia y efectivo | R-PAG-01, R-PAG-02, R-PAG-07, R-PAG-08 | CA-PAG-01, CA-PAG-02 | bloqueada (P9) |
| T3.5 | Vencimiento a las 48 h | R-PED-09, R-OPS-01 | CA-OPS-01, CA-OPS-02 | pendiente |
| T3.6 | Mails | R-NOT-01..08 | CA-NOT-01..06 | pendiente |
| T3.7 | Panel | R-PAN-01..12, R-LEG-05, R-LEG-08 | CA-PAN-01..07, CA-LEG-03, CA-LEG-06 | pendiente |

## Semana 4 — Últimos detalles y salida

| Tarea | Descripción | Requisitos | Criterios | Estado |
| :- | :- | :- | :- | :- |
| T4.1 | Quiénes somos, contacto, WhatsApp | R-SEO-02..04 | — | bloqueada (Q-SEO-01) |
| T4.2 | Legales y arrepentimiento | R-LEG-01..03 | CA-LEG-01, CA-LEG-02 | bloqueada (P5, P6) |
| T4.3 | GA4, Pixel, Search Console, Google Business | R-SEO-10..14 | CA-SEO-05, CA-SEO-06 | pendiente |
| T4.4 | Sentry y monitor | R-OPS-04, R-OPS-05, R-LEG-06 | CA-OPS-05, CA-LEG-04 | pendiente |
| T4.5 | Pruebas de punta a punta | R-SEO-09 | todos los CA de compra | pendiente |
| T4.6 | Mercado Pago a producción y compra real | R-OPS-08 | CA-PAG-03 (en producción) | pendiente |
| T4.7 | Guía, capacitación, entrega | R-OPS-09, R-OPS-10 | CA-PAN-08, CA-OPS-06 | pendiente |

## Preguntas que bloquean

| ID | Pregunta | Bloquea |
| :- | :- | :- |
| P1 | Canje de la usada y diferencia de precio | R-CAT-04, T1.5 |
| P4 | Tabla de compatibilidad de los proveedores | T2.2 |
| P5 | Monotributo o responsable inscripto | T4.2 |
| P6 | Razón social, CUIT, domicilio, horarios | T4.2, R-SEO-03 |
| P8 | Zonas de colocación y costos | R-ENT-02, T1.5 |
| P9 | Porcentaje de descuento y datos bancarios | T3.4 |
| Q-PAG-02 | Cuenta de Mercado Pago del negocio | T3.3 |
| Q-SEO-01 | Textos y fotos de "Quiénes somos" | T4.1 |
| Q-CAT-01, Q-BUS-01, Q-PED-01, Q-PED-02, Q-PAG-01, Q-NOT-01, Q-PAN-01 | Detalle en cada spec | No bloquean el arranque |
