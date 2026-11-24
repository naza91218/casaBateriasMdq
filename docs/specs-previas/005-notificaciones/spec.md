# 005 — Notificaciones

* **Estado:** borrador
* **Plan técnico:** [§2 Stack (Resend + React Email)](../../../PLAN_TECNICO.md), módulo `notificaciones`
* **Depende de:** 003, 004

## Objetivo

Que el comprador sepa en qué está su compra sin tener que preguntar, y que Mateo se entere de cada pedido nuevo al instante.

## Requisitos

| ID | Requisito |
| :- | :- |
| R-NOT-01 | El comprador debe recibir un mail en cada paso: pedido recibido, pago confirmado, en camino o listo para retirar, entregado y cancelado. |
| R-NOT-02 | Mateo debe recibir un mail por cada pedido nuevo y por cada pago confirmado, con link directo al pedido en el panel. |
| R-NOT-03 | El mail de pedido recibido con transferencia debe incluir los datos bancarios, el monto exacto y el plazo de 48 h. |
| R-NOT-04 | Todos los mails deben incluir número de pedido, productos, entrega, total, link de seguimiento y botón de WhatsApp. |
| R-NOT-05 | Los mails al comprador **no deben incluir el DNI**. |
| R-NOT-06 | Los mails deben salir desde el dominio propio (SPF, DKIM y DMARC configurados) y verse bien en Gmail del celular. |
| R-NOT-07 | Un mail que falla no debe cortar la operación del pedido: se registra el error y se reintenta. |
| R-NOT-08 | Cada mail debe enviarse una sola vez por evento, aunque el evento se procese dos veces. |

## Criterios de aceptación

| ID | Dado | Cuando | Entonces | Cumple |
| :- | :- | :- | :- | :- |
| CA-NOT-01 | un pedido con transferencia | se crea | el comprador recibe el mail con CBU/alias, monto y plazo; Mateo recibe el aviso con link al panel | R-NOT-01..03 |
| CA-NOT-02 | un pedido pagado | Mateo lo marca "en camino" | el comprador recibe "Vamos en camino" con el número de pedido | R-NOT-01 |
| CA-NOT-03 | cualquier mail al comprador | se revisa el HTML | no contiene el DNI | R-NOT-05 |
| CA-NOT-04 | Resend caído | se crea un pedido | el pedido se crea igual, el error queda registrado y el mail se envía al reintentar | R-NOT-07 |
| CA-NOT-05 | un evento "pagado" procesado dos veces | se envían mails | sale uno solo | R-NOT-08 |
| CA-NOT-06 | un mail enviado a una cuenta Gmail | se analiza con mail-tester o similar | puntaje ≥ 9/10 | R-NOT-06 |

## Fuera de alcance

Recordatorio de pago a las 24 h (no está en la propuesta; se puede cotizar), notificaciones por WhatsApp automáticas, SMS, push.

## Preguntas abiertas

* **Q-NOT-01** — ¿A qué mail llegan los avisos de Mateo? ¿Uno solo o también al local?
