# 001 — Catálogo

* **Estado:** borrador
* **Plan técnico:** [§4 Modelo de datos](../../../PLAN_TECNICO.md), módulo `catalogo`
* **Depende de:** —

## Objetivo

Que el cliente vea todas las baterías con la información justa para entender qué compra y por qué una sale más que otra, y que Mateo pueda cargar el catálogo desde una planilla.

## Historias de usuario

* Como **comprador**, quiero ver las baterías con foto, marca, medida y gama para elegir sin saber de baterías.
* Como **comprador**, quiero entender la diferencia entre económica y reforzada para decidir si vale la pena pagar más.
* Como **Mateo**, quiero cargar el catálogo desde una planilla para no cargar producto por producto.

## Requisitos

| ID | Requisito |
| :- | :- |
| R-CAT-01 | Cada producto debe tener: SKU único, marca, medida (por ejemplo 12x65), amperaje, CCA, gama (`económica` o `reforzada`), precio de lista, stock, estado activo/pausado y al menos una foto. |
| R-CAT-02 | Las marcas iniciales deben ser **Sermat, Herbo, Volta y Edna**, administrables como lista (no texto libre). |
| R-CAT-03 | Las medidas iniciales deben incluir 12x65, 12x75, 12x90, 12x110 y 12x160. |
| R-CAT-04 | Si se confirma el canje (P1), cada producto debe tener precio sin entrega y con entrega de la usada. |
| R-CAT-05 | El listado debe filtrar por marca, medida y gama, combinables, y conservar los filtros en la URL. |
| R-CAT-06 | La ficha debe mostrar fotos, especificaciones, precio de lista, precio con descuento por transferencia, autos compatibles y el servicio incluido (colocación, alternador, garantía). |
| R-CAT-07 | La tienda debe explicar la diferencia entre económica y reforzada en el listado y en la ficha. |
| R-CAT-08 | Un producto pausado o sin stock no debe poder agregarse al carrito; uno sin stock debe mostrar "Sin stock" y el botón de WhatsApp. |
| R-CAT-09 | La importación debe aceptar la planilla modelo (CSV), validar cada fila, crear o actualizar por SKU y devolver un informe de filas con error sin cortar la carga. |

## Criterios de aceptación

| ID | Dado | Cuando | Entonces | Cumple |
| :- | :- | :- | :- | :- |
| CA-CAT-01 | 10 productos de 3 marcas | el comprador filtra por "Sermat" y "reforzada" | ve solo productos Sermat reforzados y la URL contiene ambos filtros | R-CAT-05 |
| CA-CAT-02 | un producto con stock 0 | el comprador abre la ficha | ve "Sin stock", no hay botón de compra y sí uno a WhatsApp con el nombre del producto | R-CAT-08 |
| CA-CAT-03 | un producto pausado | el comprador entra a su URL | recibe 404 y el producto no figura en listados ni sitemap | R-CAT-08 |
| CA-CAT-04 | una planilla con 20 filas, 2 con medida inválida | Mateo la importa | se cargan 18 y el informe indica fila y motivo de las 2 restantes | R-CAT-09 |
| CA-CAT-05 | un SKU ya existente en la planilla | se importa con otro precio | se actualiza el precio, no se duplica el producto | R-CAT-09 |
| CA-CAT-06 | descuento por transferencia del 10 % | el comprador ve una ficha de $100.000 | ve "$100.000" y "$90.000 por transferencia" | R-CAT-06 |

## Fuera de alcance

Reseñas, comparador de productos, variantes de color, venta mayorista.

## Preguntas abiertas

* **P1** — ¿Canje de la batería usada? ¿Cuánto cambia el precio?
* **Q-CAT-01** — ¿Qué gamas tiene cada marca? ¿Todas tienen económica y reforzada?
* **Q-CAT-02** — ¿Se muestran amperaje y CCA o solo la medida? (la medida es lo que entiende el cliente)
