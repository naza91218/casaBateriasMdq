# 007 — Contenido, SEO y medición

* **Estado:** borrador
* **Plan técnico:** [§5 Rutas](../../../PLAN_TECNICO.md)
* **Depende de:** 001, 002

## Objetivo

Que la gente sepa a quién le compra (45 años, equipo, local), que la tienda aparezca cuando alguien busca "batería para mi auto en Mar del Plata", y que Mateo sepa qué publicidad le trae ventas.

## Requisitos — Contenido

| ID | Requisito |
| :- | :- |
| R-SEO-01 | La portada debe mostrar, en el primer pantallazo del celular, el buscador por auto y el servicio incluido (colocación, alternador, 12 meses de garantía). |
| R-SEO-02 | Debe existir "Quiénes somos" con la historia, los 45 años, el equipo y fotos del local y del trabajo. |
| R-SEO-03 | Debe existir "Contacto" con mapa, dirección, horarios, formas de pago y WhatsApp. |
| R-SEO-04 | Un botón flotante de WhatsApp debe estar en todas las páginas de la tienda (no en el checkout, para no distraer). |

## Requisitos — SEO

| ID | Requisito |
| :- | :- |
| R-SEO-05 | Cada producto y cada modelo de auto deben tener página propia renderizada en el servidor, con título y descripción únicos. Ejemplo: "Batería para Volkswagen Gol Trend en Mar del Plata · colocación incluida". |
| R-SEO-06 | Las fichas deben incluir datos estructurados `Product` (precio, disponibilidad, marca) y la portada `AutoPartsStore` / `LocalBusiness` con dirección y horarios. |
| R-SEO-07 | Debe generarse `sitemap.xml` con productos activos y modelos con compatibilidad, y `robots.txt` que excluya `/panel`, `/checkout` y `/pedido`. |
| R-SEO-08 | Las URLs deben ser legibles y estables: `/baterias/{slug}`, `/auto/{marca}/{modelo}`. |
| R-SEO-09 | Lighthouse móvil debe dar ≥ 90 en rendimiento, accesibilidad y SEO en portada, ficha y página de auto. |
| R-SEO-10 | La ficha de Google Business del local debe enlazar a la tienda. |

## Requisitos — Medición

| ID | Requisito |
| :- | :- |
| R-SEO-11 | Deben instalarse Google Analytics 4 y Meta Pixel con los eventos `view_item`, `add_to_cart`, `begin_checkout` y `purchase` (este último solo al confirmarse el pago). |
| R-SEO-12 | Los eventos no deben enviar datos personales (nombre, DNI, mail, dirección, teléfono). |
| R-SEO-13 | Las visitas que llegan desde campañas deben conservar sus parámetros UTM hasta la compra. |
| R-SEO-14 | La tienda debe registrarse en Google Search Console con el sitemap enviado. |

## Criterios de aceptación

| ID | Dado | Cuando | Entonces | Cumple |
| :- | :- | :- | :- | :- |
| CA-SEO-01 | la portada en un celular de 375 × 667 | carga | el buscador por auto y el servicio incluido se ven sin desplazarse | R-SEO-01 |
| CA-SEO-02 | la página de Gol Trend | se ve el HTML sin JavaScript | contiene el título, el listado de baterías y los precios | R-SEO-05 |
| CA-SEO-03 | una ficha de producto | se valida en la prueba de resultados enriquecidos de Google | `Product` es válido sin errores | R-SEO-06 |
| CA-SEO-04 | un producto pausado | se genera el sitemap | no aparece | R-SEO-07 |
| CA-SEO-05 | una compra con Mercado Pago aprobada | se revisa GA4 en vivo | aparece `purchase` con el total y sin datos personales | R-SEO-11, R-SEO-12 |
| CA-SEO-06 | una visita con `utm_source=instagram` | compra dos páginas después | la conversión se atribuye a Instagram | R-SEO-13 |

## Fuera de alcance

Blog, posicionamiento pago (SEM), API de conversiones de Meta, generación de contenido para redes.

## Preguntas abiertas

* **P6** — Horarios y datos del comercio. Dirección ya definida en los banners: **Av. Juan B. Justo 5766, Mar del Plata**.
* **Q-SEO-01** — Textos y fotos de "Quiénes somos" (semana 3).
