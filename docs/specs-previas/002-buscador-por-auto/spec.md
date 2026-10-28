# 002 — Buscador por auto

* **Estado:** borrador
* **Plan técnico:** [§4](../../../PLAN_TECNICO.md) (compatibilidad por medida, D10), módulo `compatibilidad`
* **Depende de:** 001

## Objetivo

Que nadie tenga que saber qué medida lleva su auto: elige marca, modelo y año, y ve solo las baterías que le sirven. Es el centro de la tienda.

## Historias de usuario

* Como **comprador**, quiero elegir mi auto y ver solo las baterías compatibles.
* Como **comprador cuyo auto no aparece**, quiero consultar por WhatsApp sin volver a explicar mi auto.
* Como **Juan**, quiero cargar y corregir qué medida lleva cada auto.

## Requisitos

| ID | Requisito |
| :- | :- |
| R-BUS-01 | Un vehículo debe tener marca, modelo, año desde, año hasta y, opcionalmente, motor. |
| R-BUS-02 | Cada vehículo debe estar asociado a una o más medidas compatibles. |
| R-BUS-03 | El buscador debe pedir marca → modelo → año, en ese orden, y cada paso debe mostrar solo opciones con datos. |
| R-BUS-04 | El resultado debe mostrar todos los productos activos con stock de las medidas compatibles, agrupados por gama, económica primero. |
| R-BUS-05 | Si un auto no está cargado o no hay stock de su medida, debe ofrecerse WhatsApp con un mensaje precargado: "Hola, busco batería para un {marca} {modelo} {año}". |
| R-BUS-06 | El buscador debe estar en la portada, en el listado y en el encabezado de cada página en celular. |
| R-BUS-07 | Cada modelo debe tener una URL propia e indexable: `/auto/{marca}/{modelo}` (ver 007). |
| R-BUS-08 | El último auto elegido debe recordarse en el navegador para no repetir la búsqueda. |
| R-BUS-09 | Las compatibilidades deben poder importarse desde una planilla (marca, modelo, años, medida). |

## Criterios de aceptación

| ID | Dado | Cuando | Entonces | Cumple |
| :- | :- | :- | :- | :- |
| CA-BUS-01 | Gol Trend 2008–2023 compatible con 12x65; productos 12x65 Sermat económica y Herbo reforzada | el comprador elige Volkswagen → Gol Trend → 2015 | ve las dos baterías, económica primero | R-BUS-03, R-BUS-04 |
| CA-BUS-02 | el mismo auto | elige el año 2005 (fuera de rango) | el año no figura entre las opciones | R-BUS-03 |
| CA-BUS-03 | un modelo sin compatibilidad cargada | el comprador lo busca | ve "Todavía no tenemos cargado tu auto" y un botón de WhatsApp con marca, modelo y año en el mensaje | R-BUS-05 |
| CA-BUS-04 | todas las 12x65 sin stock | se busca un Gol Trend | ve "Sin stock para tu auto" y el botón de WhatsApp | R-BUS-05 |
| CA-BUS-05 | un comprador que buscó un Corsa 2009 | vuelve a la portada | el buscador ya muestra Corsa 2009 seleccionado | R-BUS-08 |
| CA-BUS-06 | el celular a 375 px | se usa el buscador | los tres selectores y el botón se ven sin desplazamiento horizontal, con áreas táctiles ≥ 44 px | R-BUS-06 |

## Fuera de alcance

Búsqueda por patente, por medida escrita a mano o por foto de la batería.

## Preguntas abiertas

* **P4** — ¿Los proveedores tienen tabla de compatibilidad? Si no, de dónde sale (catálogos de Moura y fabricantes) y quién la mantiene.
* **Q-BUS-01** — ¿Hace falta distinguir por motor (por ejemplo, diésel lleva otra medida)?
