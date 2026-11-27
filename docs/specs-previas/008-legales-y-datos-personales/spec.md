# 008 — Legales y datos personales

* **Estado:** borrador
* **Plan técnico:** [§4.4 Datos personales](../../../PLAN_TECNICO.md)
* **Depende de:** 003

## Objetivo

Vender online cumpliendo la Ley de Defensa del Consumidor y la Ley 25.326 de protección de datos personales, y que el comprador confíe al dejar su DNI y su dirección.

## Requisitos

| ID | Requisito |
| :- | :- |
| R-LEG-01 | Deben publicarse Términos y condiciones, Política de privacidad, Política de cambios y garantía (12 meses) y datos del comercio (razón social, CUIT, domicilio), enlazados en el pie de todas las páginas. |
| R-LEG-02 | Debe existir un **botón de arrepentimiento** visible en el pie que lleve a un formulario (número de pedido, nombre, mail) y genere un código de seguimiento. |
| R-LEG-03 | La solicitud de arrepentimiento debe llegar a Mateo por mail y quedar registrada en el pedido. |
| R-LEG-04 | El checkout debe enlazar la Política de privacidad y explicar el uso de cada dato antes de confirmar. |
| R-LEG-05 | El DNI debe guardarse cifrado (AES-256-GCM) y descifrarse solo para mostrarse en el panel. |
| R-LEG-06 | El DNI, la dirección y el teléfono no deben aparecer en URLs, logs, mensajes de error, analytics ni mails al comprador. |
| R-LEG-07 | Toda la tienda debe servirse por HTTPS, con redirección desde HTTP. |
| R-LEG-08 | El comprador debe poder pedir la baja de sus datos por mail; Mateo debe poder anonimizar los datos de un pedido desde el panel sin borrar el registro contable. |

## Criterios de aceptación

| ID | Dado | Cuando | Entonces | Cumple |
| :- | :- | :- | :- | :- |
| CA-LEG-01 | cualquier página de la tienda | se mira el pie | están los enlaces legales, los datos del comercio y el botón de arrepentimiento | R-LEG-01, R-LEG-02 |
| CA-LEG-02 | un comprador con un pedido | completa el formulario de arrepentimiento | recibe un código, Mateo recibe el mail y el pedido muestra la solicitud | R-LEG-02, R-LEG-03 |
| CA-LEG-03 | un pedido guardado | se consulta la tabla directamente | el DNI no está en texto plano | R-LEG-05 |
| CA-LEG-04 | un error forzado en el checkout | se revisan los logs y Sentry | no aparece el DNI ni la dirección | R-LEG-06 |
| CA-LEG-05 | `http://` del dominio | se abre | redirige a `https://` | R-LEG-07 |
| CA-LEG-06 | un pedido entregado | Mateo lo anonimiza | nombre, DNI, teléfono, mail y dirección quedan reemplazados; total, productos y fecha se conservan | R-LEG-08 |

## Fuera de alcance

Redacción legal profesional (se usan modelos estándar, que conviene revisar con un abogado o contador), inscripción de la base de datos ante la AAIP (a cargo del negocio), facturación electrónica.

## Preguntas abiertas

* **P5** — ¿Monotributo o responsable inscripto? Cambia el texto de precios e impuestos.
* **P6** — Razón social, CUIT y domicilio legal.
