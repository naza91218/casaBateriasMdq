# Cobertura de los escenarios de aceptación (T145)

Cada escenario de la spec (`USx-NN`) tiene un test con ese código en el nombre, o figura abajo
con cómo y cuándo se valida. Actualizado el 30/10/2026, con el backend completo salvo el deploy.

**Resumen:** 68 escenarios. **52 automatizados** en el backend. Los 16 restantes dependen del
frontend (fase 11), del servidor (fase 9) o se validan a mano.

Para buscar el test de un escenario: `git grep -n "US2-09" backend/tests`.

## Automatizados (backend)

| Historia | Escenarios | Dónde |
| :- | :- | :- |
| US1 Buscador y catálogo | 01, 02, 03, 04 | `integration/compatibilidad/buscador.test.ts` |
| | 06, 07, 08, 09 | `integration/catalogo/catalogo.test.ts` |
| US2 Compra y pago | 01–06, 15 | `integration/pedidos/crear-pedido.test.ts` (y `unit/pedidos/importes.test.ts`) |
| | 07, 09, 10, 11, 12 | `contract/pagos/webhook-mercadopago.test.ts` |
| | 08, 12, 13, 14 | `contract/pedidos/seguimiento.test.ts` |
| | 16, 17 | `integration/pedidos/vencimientos.test.ts` |
| US3 Panel de pedidos | 01, 02 | `integration/auth/auth.test.ts` |
| | 03, 04, 06, 07 | `integration/pedidos/panel-pedidos.test.ts` (y `unit/pedidos/maquina-estados.test.ts`) |
| | 05 | `contract/pedidos/admin-rutas.test.ts` |
| US4 Mails | 01–05 | `integration/notificaciones/mails.test.ts` (04 y 05 también en `outbox.test.ts`) |
| US5 Catálogo e importación | 01, 02, 07 | `integration/importacion/importacion.test.ts` |
| | 03, 04, 05, 06 | `integration/catalogo/admin-productos.test.ts` |
| | 08 | `integration/configuracion/admin-configuracion.test.ts` |
| US6 SEO y GEO (datos) | 04, 07 | `contract/seo/seo.test.ts` (el marcado FAQPage de 07 se revisa también en staging) |
| | 09 | `integration/notificaciones/mails.test.ts` |
| US7 Legales | 02, 03, 04, 06 | `integration/legales/legales.test.ts` |

## Pendientes y validaciones a mano

| Escenario | Qué verifica | Cómo y cuándo |
| :- | :- | :- |
| US1-05 | El buscador recuerda el último auto | Frontend (fase 11): Playwright |
| US1-10 | Buscador usable a 375 px | Frontend (fase 11): Playwright con viewport de celular |
| US3-08 | Mateo gestiona un pedido sin ayuda en menos de 3 minutos | A mano, con la guía de uso, antes de salir |
| US4-06 | Reputación de los mails ≥ 9/10 | A mano en staging con mail-tester.com (`infra/README.md`) |
| US6-01 | Portada en 375 × 667 sin desplazamiento | Frontend (fase 11): Playwright |
| US6-02 | Página del auto legible sin JavaScript | Frontend (fase 11): test que pide el HTML sin ejecutar scripts. Los datos ya los da `GET /vehiculos/:marca/:modelo` |
| US6-03 | Datos de producto válidos para Google | A mano: prueba de resultados enriquecidos, en staging |
| US6-05 | Compra en la analítica, sin datos personales | A mano en staging, con la vista en vivo de GA4 y Meta |
| US6-06 | Atribución de campaña de Instagram | A mano en staging, con una URL con `utm_source=instagram` |
| US6-08 | `robots.txt` permite a los buscadores con IA | Frontend (fase 11): test del archivo generado |
| US7-01 | Pie con legales, datos del comercio y arrepentimiento | Frontend (fase 11): Playwright |
| US7-05 | `http://` redirige a `https://` | Servidor (fase 9): Nginx; se verifica con `curl -I` en staging |
| US8-01 | Restaurar la copia de ayer | Servidor (fase 9): procedimiento de `infra/README.md`, probado antes de salir |
| US8-02 | Un test fallido frena la publicación | Servidor (fase 9): GitHub Actions |
| US8-03 | Aviso por mail si la tienda se cae 5 minutos | Servidor (fase 9): monitor externo |
| US8-04 | Cuentas y servidor a nombre del cliente | A mano: acta de entrega |

## Otros tests que no son escenarios

- Inyección de SQL y de HTML en los mails, en todos los endpoints públicos y el login (T149):
  `contract/seguridad/inyeccion.test.ts`.
- Cabeceras de seguridad, acciones del panel desde otro sitio e IP real detrás del proxy (T146):
  `contract/seguridad/cabeceras.test.ts`.
- El DNI, el teléfono y la dirección no salen en ninguna respuesta pública (SC-012):
  `contract/legales/sin-dni.test.ts`.
- Configuración que se niega a arrancar un servidor sin credenciales o con claves de ejemplo:
  `unit/platform/config.test.ts`.
- Scraper del catálogo: `tools/scraper/tests/` (44 tests).
