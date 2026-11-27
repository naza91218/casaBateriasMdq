# 006 — Panel

* **Estado:** borrador
* **Plan técnico:** [§2 Stack (Auth.js), §5 Rutas `/panel`](../../../PLAN_TECNICO.md)
* **Depende de:** 001–005

## Objetivo

Una pantalla simple, desde la compu o el celular, para que Mateo gestione pedidos, precios, stock y fotos sin ayuda técnica.

## Requisitos — Acceso

| ID | Requisito |
| :- | :- |
| R-PAN-01 | El panel debe estar en `/panel` y exigir login por enlace enviado al mail autorizado; cualquier ruta sin sesión redirige al ingreso. |
| R-PAN-02 | La sesión debe durar 30 días en el mismo dispositivo y poder cerrarse. |
| R-PAN-03 | El modelo de usuarios debe admitir más de un usuario y roles a futuro, aunque al inicio haya solo uno. |

## Requisitos — Pedidos

| ID | Requisito |
| :- | :- |
| R-PAN-04 | La lista de pedidos debe mostrar primero los nuevos y filtrar por estado. |
| R-PAN-05 | El detalle debe mostrar productos, total, medio de pago, entrega y los datos del comprador **incluido el DNI**, con botón para abrir la dirección en Google Maps y para escribirle por WhatsApp. |
| R-PAN-06 | Mateo debe poder confirmar una transferencia o un pago en efectivo con un clic (con confirmación). |
| R-PAN-07 | Mateo debe poder pasar el pedido a en camino, listo para retirar, entregado o cancelado, solo entre transiciones válidas; cada cambio dispara el mail correspondiente. |

## Requisitos — Productos y configuración

| ID | Requisito |
| :- | :- |
| R-PAN-08 | Mateo debe poder buscar un producto y editar precio y stock en el listado, sin abrir la ficha. |
| R-PAN-09 | Mateo debe poder pausar o activar un producto y subir, ordenar y borrar fotos desde el celular. |
| R-PAN-10 | Mateo debe poder editar el porcentaje de descuento, los datos bancarios, los horarios, el WhatsApp y las zonas de colocación. |
| R-PAN-11 | Mateo debe poder asignar o quitar autos compatibles a una medida *(si entra en tiempo; si no, por planilla)*. |
| R-PAN-12 | Todo el panel debe usarse en un celular de 375 px sin zoom. |

## Criterios de aceptación

| ID | Dado | Cuando | Entonces | Cumple |
| :- | :- | :- | :- | :- |
| CA-PAN-01 | sin sesión | se abre `/panel/pedidos` | redirige al ingreso | R-PAN-01 |
| CA-PAN-02 | un mail no autorizado | pide el enlace de ingreso | no se envía nada y la pantalla dice lo mismo que con un mail válido | R-PAN-01 |
| CA-PAN-03 | un pedido por transferencia | Mateo toca "Confirmar transferencia" y acepta | pasa a `pagado` y el comprador recibe el mail | R-PAN-06 |
| CA-PAN-04 | un pedido con colocación | Mateo toca "Abrir en el mapa" | se abre Google Maps con la dirección | R-PAN-05 |
| CA-PAN-05 | un producto a $100.000 | Mateo cambia el precio a $110.000 en el listado | la ficha pública muestra $110.000 en menos de 1 minuto | R-PAN-08 |
| CA-PAN-06 | un pedido `entregado` | Mateo abre el menú de estados | no aparecen estados anteriores | R-PAN-07 |
| CA-PAN-07 | el bundle del navegador | se inspecciona | no contiene claves de Mercado Pago, Resend, R2 ni la clave de cifrado | R-PAN-01 |
| CA-PAN-08 | Mateo con la guía de uso | sin ayuda, gestiona un pedido completo y edita un producto | lo logra en menos de 10 minutos | R-PAN-04..09 |

## Fuera de alcance

Reportes de ventas, varios usuarios con permisos distintos, edición de textos de la tienda desde el panel.

## Preguntas abiertas

* **Q-PAN-01** — ¿Qué mail usa Mateo para entrar?
