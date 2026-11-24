# 009 — Operación

* **Estado:** borrador
* **Plan técnico:** [§2 Stack, §8 Variables de entorno](../../../PLAN_TECNICO.md)
* **Depende de:** todas

## Objetivo

Que la tienda esté siempre en línea, que la información no se pierda y que el mantenimiento de USD [monto] por mes sea sostenible para una sola persona.

## Requisitos

| ID | Requisito |
| :- | :- |
| R-OPS-01 | Una tarea programada debe correr cada hora y cancelar los pedidos vencidos a las 48 h, devolviendo el stock (cumple R-PED-09). |
| R-OPS-02 | Debe hacerse una copia de la base todos los días, guardarse fuera de Neon (R2) y conservarse 30 días. |
| R-OPS-03 | Debe existir un procedimiento escrito de restauración, probado antes de la salida y una vez por trimestre. |
| R-OPS-04 | Los errores del servidor deben reportarse a Sentry y avisar por mail al desarrollador. |
| R-OPS-05 | Un monitor externo debe revisar la tienda cada 5 minutos y avisar si no responde. |
| R-OPS-06 | Cada push a `main` debe correr lint, chequeo de tipos, tests y migraciones antes de publicar; si algo falla, no se publica. |
| R-OPS-07 | Cada cambio debe poder verse en una URL de preview antes de pasar a producción. |
| R-OPS-08 | Sandbox y producción de Mercado Pago deben usar credenciales separadas; la base de preview no debe ser la de producción. |
| R-OPS-09 | Todas las cuentas (dominio, GitHub, Netlify, Neon, Resend, Cloudflare, Mercado Pago, Sentry) deben estar a nombre del negocio, con el desarrollador como colaborador, y quedar documentadas en el acta de entrega. |
| R-OPS-10 | Un documento de soporte debe listar qué hacer ante: tienda caída, pago no acreditado, mail no recibido, stock desfasado. |

## Criterios de aceptación

| ID | Dado | Cuando | Entonces | Cumple |
| :- | :- | :- | :- | :- |
| CA-OPS-01 | un pedido `pendiente_pago` creado hace 49 h | corre la tarea | queda `cancelado`, el stock vuelve y el comprador recibe el mail de cancelación | R-OPS-01 |
| CA-OPS-02 | un pedido de hace 47 h | corre la tarea | sigue `pendiente_pago` | R-OPS-01 |
| CA-OPS-03 | el backup de ayer | se restaura en una rama nueva de Neon | la tienda de preview funciona con esos datos | R-OPS-02, R-OPS-03 |
| CA-OPS-04 | un test que falla | se hace push a `main` | Netlify no publica y queda la versión anterior | R-OPS-06 |
| CA-OPS-05 | la tienda caída | pasan 5 minutos | llega un aviso por mail | R-OPS-05 |
| CA-OPS-06 | el acta de entrega | Mateo la revisa | todas las cuentas figuran con su dueño y sus accesos | R-OPS-09 |

## Fuera de alcance

Guardias 24/7, alta disponibilidad multi-región, monitoreo de rendimiento avanzado.
