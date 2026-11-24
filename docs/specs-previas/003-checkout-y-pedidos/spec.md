# 003 — Checkout y pedidos

* **Estado:** borrador
* **Plan técnico:** [§4.1 Estados, §4.2 Stock](../../../PLAN_TECNICO.md), módulos `pedidos`, `clientes`, `entregas`
* **Depende de:** 001, 002

## Objetivo

Que el cliente compre en pocos pasos, sin cuenta, y que Mateo sepa **a quién y a dónde va** antes de salir con la camioneta.

## Historias de usuario

* Como **comprador**, quiero comprar sin crear una cuenta y entender por qué me piden cada dato.
* Como **comprador**, quiero elegir si me la colocan a domicilio o la retiro en el local.
* Como **Mateo**, quiero tener nombre, DNI, teléfono y dirección antes de salir.
* Como **comprador**, quiero ver el estado de mi pedido con un link, sin preguntar.

## Requisitos — Checkout

| ID | Requisito |
| :- | :- |
| R-PED-01 | El checkout debe funcionar como invitado y pedir: nombre y apellido, DNI, teléfono, mail y, si hay colocación, dirección, zona y referencias. Cada dato con una línea que explique para qué se usa. |
| R-PED-02 | Al confirmar, la tienda debe crear el pedido y **descontar el stock en la misma transacción**; si algún ítem no alcanza, no se crea nada y se informa qué producto falta. |
| R-PED-03 | Los importes (subtotal, descuento, costo de zona, total) deben calcularse en el servidor; el navegador solo envía productos, cantidades y opciones. |
| R-PED-04 | El checkout debe completarse en una sola página, con validación en vivo y mensajes de error que digan cómo corregir. |
| R-PED-05 | Cada pedido debe tener un número correlativo legible (por ejemplo `#1048`) y un link privado de seguimiento `/pedido/{id}?t={token}`. |
| R-PED-06 | El carrito debe conservarse en el navegador si el comprador sale y vuelve. |

## Requisitos — Entrega

| ID | Requisito |
| :- | :- |
| R-ENT-01 | Los métodos de entrega deben ser **colocación a domicilio** (con zona) y **retiro en el local**. |
| R-ENT-02 | Las zonas de colocación deben ser configurables, con costo extra opcional (0 por defecto). |
| R-ENT-03 | La dirección de colocación debe validarse como completa (calle, número, zona) y ofrecer un campo de referencias. |

## Requisitos — Estados

| ID | Requisito |
| :- | :- |
| R-PED-07 | Los estados válidos deben ser: `pendiente_pago`, `a_pagar_en_local`, `pagado`, `en_camino`, `listo_para_retirar`, `entregado`, `cancelado`, con las transiciones de PLAN_TECNICO §4.1. Cualquier otra transición debe rechazarse. |
| R-PED-08 | Todo cambio de estado debe registrar estado anterior, nuevo, quién y cuándo. |
| R-PED-09 | Un pedido `pendiente_pago` o `a_pagar_en_local` sin pago a las **48 h** debe pasar a `cancelado` y devolver el stock (ver 009). |
| R-PED-10 | Cancelar un pedido debe devolver su stock una sola vez, aunque la cancelación se intente dos veces. |

## Criterios de aceptación

| ID | Dado | Cuando | Entonces | Cumple |
| :- | :- | :- | :- | :- |
| CA-PED-01 | un carrito con una batería | el comprador elige colocación sin cargar dirección | no puede confirmar y ve "Falta la dirección para ir a colocarla" | R-PED-01, R-ENT-03 |
| CA-PED-02 | un DNI con letras | se intenta confirmar | ve "El DNI tiene solo números, sin puntos" | R-PED-04 |
| CA-PED-03 | stock 1 de un producto | dos compradores confirman a la vez | uno crea el pedido y el otro ve "Se agotó mientras comprabas"; el stock queda en 0, nunca en −1 | R-PED-02 |
| CA-PED-04 | un request con un precio alterado desde el navegador | se crea el pedido | el total es el calculado por el servidor | R-PED-03 |
| CA-PED-05 | un pedido `entregado` | se intenta pasarlo a `pendiente_pago` | se rechaza y queda registrado el intento | R-PED-07 |
| CA-PED-06 | un pedido cancelado | se cancela de nuevo | el stock no vuelve a sumarse | R-PED-10 |
| CA-PED-07 | un pedido creado | el comprador abre su link de seguimiento | ve número, productos, entrega, estado y, si corresponde, los datos bancarios; **no ve su DNI** | R-PED-05 |
| CA-PED-08 | el link de seguimiento con un token incorrecto | se abre | responde 404 | R-PED-05 |
| CA-PED-09 | una zona "Batán" con costo extra $5.000 | se elige colocación en Batán | el total suma $5.000 y se muestra desglosado | R-ENT-02 |

## Fuera de alcance

Cuentas de cliente, turnos de colocación con día y horario, cupones, envío fuera de Mar del Plata.

## Preguntas abiertas

* **P8** — Zonas de colocación y si alguna tiene costo extra.
* **Q-PED-01** — ¿Se permite más de una batería por pedido (por ejemplo, flotas o dos autos)?
* **Q-PED-02** — ¿48 h también para "pagar al retirar", o un plazo distinto?
