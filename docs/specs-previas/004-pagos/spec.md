# 004 — Pagos

* **Estado:** borrador
* **Plan técnico:** [§4.3 Mercado Pago](../../../PLAN_TECNICO.md), módulo `pagos`
* **Depende de:** 003

## Objetivo

Cobrar online con Mercado Pago, mostrar el beneficio de pagar por transferencia en lugar de un recargo por tarjeta, y que un pedido figure pagado **solo** cuando el pago está confirmado.

## Requisitos

| ID | Requisito |
| :- | :- |
| R-PAG-01 | Los medios de pago deben ser: **Mercado Pago** (Checkout Pro), **transferencia** con descuento y **efectivo al retirar** (solo con retiro en el local). |
| R-PAG-02 | El precio publicado debe ser el de lista; la transferencia debe aplicar el descuento configurado (porcentaje editable en el panel). |
| R-PAG-03 | Con Mercado Pago, la tienda debe crear una preferencia con el número de pedido como referencia externa y redirigir al checkout de MP. |
| R-PAG-04 | Un pedido debe pasar a `pagado` solo después de que la tienda **consulte el pago a la API de Mercado Pago** y su estado sea `approved` con el monto correcto. El regreso del navegador nunca cambia el estado. |
| R-PAG-05 | El webhook de Mercado Pago debe validar la firma, ser idempotente y responder 200 aunque el pedido ya esté pagado. |
| R-PAG-06 | Un pago rechazado debe dejar el pedido en `pendiente_pago` y permitir reintentar desde el link de seguimiento. |
| R-PAG-07 | Con transferencia, el pedido debe quedar `pendiente_pago` y mostrar CBU/alias, titular, monto exacto y plazo de 48 h, en la pantalla final y en el mail. |
| R-PAG-08 | Con efectivo, el pedido debe quedar `a_pagar_en_local`. |
| R-PAG-09 | Cada intento de pago debe registrarse (proveedor, ID externo, estado, monto, fecha). |

## Criterios de aceptación

| ID | Dado | Cuando | Entonces | Cumple |
| :- | :- | :- | :- | :- |
| CA-PAG-01 | colocación a domicilio elegida | el comprador ve los medios de pago | "Efectivo al retirar" no aparece | R-PAG-01 |
| CA-PAG-02 | descuento 10 % y un pedido de $100.000 | elige transferencia | el total pasa a $90.000 y los datos bancarios muestran $90.000 | R-PAG-02, R-PAG-07 |
| CA-PAG-03 | un pago aprobado en sandbox | llega el webhook | la tienda consulta el pago, el pedido pasa a `pagado` y se registra el pago | R-PAG-04, R-PAG-09 |
| CA-PAG-04 | el comprador vuelve de MP con `status=approved` en la URL pero sin webhook | se abre la página de retorno | el pedido sigue `pendiente_pago` y la página dice "Estamos confirmando tu pago" | R-PAG-04 |
| CA-PAG-05 | el mismo webhook enviado tres veces | se procesa | el pedido cambia una vez y se envía un solo mail | R-PAG-05 |
| CA-PAG-06 | un webhook con firma inválida | llega | se rechaza con 401 y no cambia nada | R-PAG-05 |
| CA-PAG-07 | un pago aprobado por un monto menor al del pedido | llega el webhook | el pedido no se marca pagado y queda una alerta para Juan | R-PAG-04 |
| CA-PAG-08 | un pago rechazado | el comprador vuelve | ve "El pago no se aprobó" y un botón para reintentar | R-PAG-06 |

## Fuera de alcance

Cuotas sin interés propias, pagos parciales, reembolsos desde la tienda (se hacen desde Mercado Pago), facturación electrónica.

## Preguntas abiertas

* **P9** — Porcentaje de descuento por transferencia y datos bancarios.
* **Q-PAG-01** — ¿El descuento aplica también al efectivo al retirar?
* **Q-PAG-02** — Cuenta de Mercado Pago a nombre del negocio (necesaria en semana 2).
