# Especificación de interfaz — La Casa de las Baterías

> Tienda online de baterías para auto en Mar del Plata, con 45 años de trayectoria. El cliente busca su auto, ve qué batería le sirve, la compra en pocos pasos y elige si se la colocan a domicilio o la retira en el local. Incluye un panel simple para el dueño.
>
> Requisitos funcionales completos: [specs/](specs/README.md).
>
> **Referencias visuales:** `D:\diseños\la casa de las baterias` (isotipo CB y dos banners). Esta especificación sigue esas piezas; si algo no coincide, mandan los diseños.

---

## 1. Personalidad

| Es | No es |
| :- | :- |
| Taller de confianza, directo, con oficio | Tienda genérica de electrónica |
| Enérgico (rojo y naranja de chispa, negro de batería) | Recargado, agresivo, "gamer" |
| Claro para alguien grande que usa poco internet | Minimalista al punto de esconder cosas |
| Local de barrio con 45 años | Marca corporativa fría |

### 1.1 Identidad existente

| Elemento | Cómo es en los diseños |
| :- | :- |
| Isotipo | Monograma **CB** en itálica pesada, esquinas redondeadas. La **C** es una celda con un **rayo** adentro. Dos versiones: C y B separadas, y C unida a la B por una barra (C-B) |
| Versiones del isotipo | Blanco sobre fondo degradé rojo→naranja con patrón de rayos · degradé rojo→naranja con camuflaje de rayos sobre blanco |
| Logotipo | Isotipo CB + caja con "LA **CASA** DE LAS / **BATERÍAS**." en mayúsculas itálicas condensadas; "CASA" y "BATERÍAS" en rojo, el resto en blanco o negro según el fondo |
| Slogan | **"45 AÑOS CARGANDO CONFIANZA."** — "45 AÑOS" en rojo, el resto en negro |
| Propuestas de valor | **Baterías con garantía** (escudo) · **Marcas nacionales** (bandera argentina) · **Con o sin colocación** (rayo) |
| Marcas | **Sermat, Edna, Herbo, Volta**, con sus logos originales en blanco o negro |
| Dirección | **Av. Juan B. Justo 5766, Mar del Plata** (con ícono de ubicación) |
| Patrón | Rayos redondeados repetidos en diagonal, en un tono apenas más oscuro que el fondo |
| Formas | Cajas y etiquetas en **paralelogramo** (inclinadas como la itálica del logo), negras o rojas |

**Tono de los textos:** voseo rioplatense, frases cortas, sin tecnicismos. "Elegí tu auto", "Te la colocamos en tu casa", "¿No encontrás tu auto? Escribinos".

---

## 2. Colores

### 2.1 Paleta

| Token | Hex | Uso |
| :- | :- | :- |
| `rojo` | `#FF2610` | Color de marca. Botón principal, precio, palabras destacadas ("CASA", "BATERÍAS", "45 AÑOS"), íconos |
| `naranja` | `#FF4E10` | Extremo del degradé de marca, hover del botón principal, etiqueta "Reforzada" |
| `degradé` | `linear-gradient(90deg, #FF2610, #FF4E10)` | Fondos de marca: hero, banda de propuestas de valor, isotipo, etiquetas de marcas |
| `negro` | `#0B0B0B` | Texto, encabezado, pie, fondos de secciones de impacto |
| `blanco` | `#FFFFFF` | Fondo principal, texto sobre negro |

### 2.2 Neutros de apoyo (derivados, no son colores de marca)

| Token | Hex | Uso |
| :- | :- | :- |
| `gris-900` | `#1C1C1C` | Tarjetas sobre fondo negro |
| `gris-600` | `#5C5C5C` | Texto secundario sobre blanco (contraste 6,7:1) |
| `gris-300` | `#D9D9D9` | Bordes de campos y separadores |
| `gris-100` | `#F4F4F4` | Fondos de secciones alternas y de tarjetas |
| `rojo-texto` | `#D41A00` | Links y texto rojo **chico** sobre blanco (contraste 5,3:1) |
| `verde-ok` | `#187A33` | Estados "Pagado" y "Entregado", mensajes de éxito (contraste 5,4:1 sobre blanco) |
| `amarillo-aviso` | `#B87900` | Fondo del chip "Pendiente de pago", siempre con texto negro (nunca como texto sobre blanco) |

### 2.3 Contraste (WCAG AA)

| Combinación | Contraste | Se puede usar para |
| :- | :- | :- |
| Negro sobre blanco | 19:1 | Todo |
| Blanco sobre negro | 19:1 | Todo |
| Negro sobre `#FF2610` | 5,2:1 | Todo |
| Negro sobre `#FF4E10` | 6,0:1 | Todo |
| `#FF2610` sobre negro | 5,2:1 | Todo |
| Blanco sobre `#FF2610` | 3,8:1 | **Solo texto grande:** ≥ 24 px, o ≥ 19 px en negrita |
| Blanco sobre `#FF4E10` | 3,3:1 | **Solo texto grande** |
| `#FF2610` sobre blanco | 3,8:1 | **Solo títulos grandes, precios grandes e íconos.** Para texto chico usar `rojo-texto` |

### 2.4 Proporción

* **Blanco 60 %** (fondo de compra), **negro 30 %** (encabezado, pie, secciones de confianza), **rojo y naranja 10 %**.
* El rojo marca **una acción por pantalla**: si todo es rojo, nada destaca.
* El naranja nunca compite con el rojo en el mismo botón o título; se usa para detalles y estados.
* El **degradé** rojo→naranja (izquierda a derecha) es parte de la marca: se usa en superficies grandes (hero, bandas, isotipo, etiquetas de marcas), siempre con el **patrón de rayos** encima al 6–10 % de opacidad en un tono más oscuro.
* En botones, campos y texto corrido: colores planos, sin degradé.
* Texto sobre el degradé: blanco y grande (títulos, etiquetas en negrita ≥ 19 px) o negro.

---

## 3. Tipografía

| Rol | Fuente | Peso | Notas |
| :- | :- | :- | :- |
| Títulos de impacto | **Sport Headline** (licencia comercial, archivos locales) | Bold, ExtraBold y Black, normal e **Italic** | Titulares cortos en mayúsculas ("45 AÑOS EN EL MERCADO"), etiquetas en paralelogramo, nombres de marcas |
| Logotipo | **Sport Headline** Italic | ExtraBold o Black | Solo en el logo; en la web el logotipo va como SVG, no como texto |
| Texto e interfaz | **Montserrat** (Google Fonts) | 400, 500, 600, 700 | Párrafos, botones, formularios, panel, slogan ("45 AÑOS CARGANDO CONFIANZA.") |
| Números (precios, medidas) | **Montserrat** con números tabulares | 700 | `font-variant-numeric: tabular-nums` |

**Sport Headline en la web:** para usarla como fuente web hace falta que la licencia lo permita (las licencias de escritorio no suelen incluirlo). Si la licencia lo cubre, se convierte a `woff2` y se sirve desde la propia tienda con `font-display: swap`, cargando solo los 2–3 pesos que se usan. Si no, los titulares de la web van en **Montserrat ExtraBold Italic** y Sport Headline queda para piezas gráficas e imágenes.

Fallback en CSS: `font-family: "Sport Headline", "Montserrat", system-ui, sans-serif;`

Los títulos en mayúsculas condensadas van en titulares cortos (hasta ~6 palabras). Párrafos, formularios y textos del checkout van en minúsculas con la fuente de interfaz, para que se lean bien.

### Escala

| Token | Celular | Escritorio | Uso |
| :- | :- | :- | :- |
| `display` | 40 / 44 px | 72 / 76 px | Título de portada |
| `h1` | 32 / 36 | 48 / 52 | Título de página |
| `h2` | 26 / 30 | 36 / 40 | Secciones |
| `h3` | 20 / 26 | 24 / 30 | Tarjetas, pasos |
| `body-lg` | 18 / 28 | 20 / 30 | Textos de portada, explicaciones |
| `body` | **17 / 26** | 17 / 26 | Texto general (nunca menos de 16 px) |
| `small` | 15 / 22 | 15 / 22 | Ayudas de formularios, legales |
| `precio` | 28 / 32 | 36 / 40 | Precio en ficha |

---

## 4. Espaciado, bordes y sombras

| Token | Valor |
| :- | :- |
| Escala de espacios | 4, 8, 12, 16, 24, 32, 48, 64, 96 px |
| Márgenes laterales | 16 px celular · 24 px tablet · 48 px escritorio |
| Ancho máximo de contenido | 1200 px |
| Radio | 10 px campos y botones · 16 px tarjetas · 999 px chips y etiquetas |
| Sombra de tarjeta | `0 6px 20px -8px rgba(0,0,0,.18)` |
| Sombra de botón flotante | `0 10px 24px -8px rgba(0,0,0,.35)` |
| Área táctil mínima | **48 × 48 px** |

**Motivo gráfico:** el **rayo** de la C del isotipo. Aparece como patrón en los fondos con degradé, como ícono en los botones principales y en la propuesta "Con o sin colocación". Las **cajas en paralelogramo** (inclinadas como la itálica del logo) se usan para etiquetas, títulos destacados y la lista de marcas.

---

## 5. Componentes

### 5.1 Botones

| Variante | Estilo | Uso |
| :- | :- | :- |
| Principal | Fondo `rojo`, texto blanco 19 px negrita (o negro), alto 56 px, radio 10 | Una por pantalla: "Ver baterías", "Comprar", "Confirmar compra" |
| Principal hover / presionado | Fondo `naranja` / fondo `#E01E08` | — |
| Secundario | Borde 2 px negro, texto negro, fondo transparente | "Ver detalles", "Seguir comprando" |
| Sobre negro | Fondo blanco, texto negro | CTA en secciones oscuras |
| WhatsApp | Fondo `#25D366`, ícono y texto negros | Consultas |
| Deshabilitado | Fondo `gris-300`, texto `gris-600` | "Sin stock" |

Estado de foco en todo lo interactivo: anillo de 3 px `negro` con 2 px de separación (sobre negro, anillo blanco).

### 5.2 Formularios

* Etiqueta arriba del campo, siempre visible (no solo placeholder). 17 px, negrita.
* Debajo de la etiqueta, en `small` y `gris-600`, **para qué se pide el dato**. Ejemplo para DNI: "Lo pedimos para identificarte cuando vamos a colocarla".
* Campo de 56 px de alto, borde 1,5 px `gris-300`, foco con borde 2 px negro.
* Error: borde `rojo-texto`, ícono y mensaje debajo que dice cómo corregir ("El DNI tiene solo números, sin puntos").
* Teclado adecuado en celular: numérico para DNI y teléfono, mail para el mail.

### 5.3 Buscador por auto (componente estrella)

* Tres selectores grandes en fila (escritorio) o apilados (celular): **Marca → Modelo → Año**. Cada uno se habilita al completar el anterior.
* Botón principal "Ver baterías para mi auto".
* Debajo, link: "¿No encontrás tu auto? Escribinos por WhatsApp".
* Versión compacta en el encabezado de las páginas internas: muestra el auto elegido ("VW Gol Trend 2015 · Cambiar").
* Fondo: tarjeta blanca sobre sección negra, con sombra.

### 5.4 Tarjeta de producto

* Foto sobre fondo `gris-100`, proporción 4:3.
* Marca (Sermat, Herbo, Volta o Edna) en `small` mayúsculas.
* Nombre: medida y gama, por ejemplo **"12x65 · Reforzada"**.
* Etiqueta de gama: `Económica` (chip borde negro) o `Reforzada` (chip fondo `naranja`, texto negro).
* Precio de lista en `h3` negro y, debajo, **"$X por transferencia"** en `rojo-texto` negrita.
* Línea de servicio con íconos: colocación incluida · 12 meses de garantía.
* Botón "Comprar" de ancho completo.
* Sin stock: foto en gris al 40 %, chip "Sin stock" y botón de WhatsApp en lugar de "Comprar".

### 5.5 Otros

| Componente | Especificación |
| :- | :- |
| Encabezado | Negro, 64 px (celular) / 80 px (escritorio). Logotipo (CB + caja "LA CASA DE LAS BATERÍAS") a la izquierda; en celular, solo el isotipo CB; menú (Baterías, Quiénes somos, Contacto), carrito con contador rojo. En celular: logo, carrito y menú hamburguesa |
| Barra de confianza | Tira bajo el encabezado, fondo `degradé`, texto blanco 16 px negrita con íconos: "Baterías con garantía · Marcas nacionales · Con o sin colocación" |
| Etiqueta en paralelogramo | Caja inclinada ~12°, fondo negro o `degradé`, texto en mayúsculas condensadas; con un cuadrado blanco redondeado a un costado para el ícono (como en los banners) |
| Logos de marcas | Sermat, Edna, Herbo y Volta en blanco sobre degradé o negro, o como etiquetas en paralelogramo |
| Botón flotante de WhatsApp | Círculo de 60 px abajo a la derecha, en todas las páginas menos el checkout |
| Pasos de compra | Números en círculos negros de 40 px con texto blanco, unidos por una línea |
| Chips de estado (panel) | Pendiente de pago (fondo amarillo, texto negro), Pagado (fondo verde, texto blanco), En camino (fondo negro, texto blanco), Listo para retirar (fondo naranja, texto negro), Entregado (contorno verde, texto verde), Cancelado (fondo `gris-100`, texto `gris-600`) |
| Pie | Negro. Logo, dirección, horarios, WhatsApp, medios de pago, links legales y **botón de arrepentimiento** visible |
| Íconos | Línea de 2 px, esquinas redondeadas (estilo Lucide), nunca emojis |

---

## 6. Pantallas

Diseñar primero a **375 px** de ancho y después escritorio a 1440 px.

### 6.1 Portada

1. Encabezado + barra de confianza.
2. **Hero banner** (ver §6.1.1).
3. **Cómo funciona:** 4 pasos (Buscás tu auto → Elegís la batería → Pagás → Te la colocamos).
4. **Gamas:** económica vs reforzada, dos columnas, explicación corta de cuándo conviene cada una.
5. **Marcas:** Sermat, Edna, Herbo y Volta como en el banner 1: etiquetas en paralelogramo con degradé sobre fondo negro con fotos de baterías.
6. **El servicio:** colocación a domicilio, medición del alternador, garantía de 12 meses. Fondo negro, íconos en rojo.
7. **45 años en el mercado:** bloque con degradé y titular condensado itálico "45 AÑOS EN EL MERCADO", bajada en caja negra "BRINDANDO EL MEJOR SERVICIO", foto del local o del equipo y link a "Quiénes somos".
8. **Formas de pago:** Mercado Pago, transferencia con descuento, efectivo al retirar.
9. Pie.

#### 6.1.1 Hero banner

Primer bloque de la portada, debajo del encabezado. Sigue la estructura del banner 2.

**Contenido, en este orden**

| Elemento | Texto | Estilo |
| :- | :- | :- |
| Titular (`h1`) | **45 AÑOS CARGANDO CONFIANZA** | Sport Headline Black Italic, mayúsculas. "45 AÑOS" en `rojo`, "CARGANDO CONFIANZA" en `negro`. Sin punto final en la web |
| Bajada | "Encontrá la batería justa para tu auto. Te la colocamos en Mar del Plata." | Montserrat 500, `body-lg`, `gris-600` |
| Buscador por auto | Marca · Modelo · Año + "Ver baterías para mi auto" | Tarjeta blanca con sombra (§5.3), botón principal rojo con ícono de rayo |
| Link secundario | "¿No encontrás tu auto? Escribinos por WhatsApp" | Montserrat 600, `rojo-texto`, debajo del buscador |
| Banda de propuestas | Baterías con garantía · Marcas nacionales · Con o sin colocación | Banda inferior con `degradé` y patrón de rayos; cada propuesta en etiqueta negra en paralelogramo con el ícono en un cuadrado blanco |

**Fondo:** blanco, con fotos de baterías de las cuatro marcas en escala de grises al 15–20 % de opacidad y trama de puntos, como en el banner 2. Las fotos nunca pasan por detrás del titular con contraste bajo: si hace falta, un velo blanco al 70 % detrás del texto.

**Tamaños del titular**

| Pantalla | Tamaño / interlínea | Disposición |
| :- | :- | :- |
| Celular (375 px) | 44 / 42 px, en 3 líneas: "45 AÑOS" / "CARGANDO" / "CONFIANZA" | Centrado |
| Tablet (768 px) | 64 / 60 px, en 2 líneas: "45 AÑOS" / "CARGANDO CONFIANZA" | Centrado |
| Escritorio (1440 px) | 96 / 88 px, en 2 líneas | Centrado, ancho máximo 1000 px |

**Alturas y espacios**

* Celular: el titular, la bajada y el buscador deben entrar en el primer pantallazo (≈ 640 px de alto útil). La banda de propuestas puede quedar justo debajo, con desplazamiento.
* Escritorio: alto mínimo 640 px y máximo 820 px; banda de propuestas de 88 px pegada al borde inferior.
* Espacio de 24 px entre titular y bajada, 32 px entre bajada y buscador (40 y 48 px en escritorio).

**Variante oscura** (para campañas o fechas especiales): fondo negro con las fotos en gris oscuro, "45 AÑOS" en `rojo` y "CARGANDO CONFIANZA" en `blanco`. Misma estructura.

**Accesibilidad y rendimiento**

* El titular es texto real (`h1`), no una imagen, para Google y lectores de pantalla.
* La imagen de fondo en `webp` o `avif`, menos de 200 KB, con carga prioritaria y versión más liviana para celular.
* Si Sport Headline no tiene licencia web, el titular va en Montserrat ExtraBold Italic con los mismos tamaños.

### 6.2 Resultado por auto (`/auto/marca/modelo`)

Título "Baterías para Volkswagen Gol Trend", auto elegido con opción de cambiar, tarjetas agrupadas por gama (económica primero). Estado vacío: "Todavía no tenemos cargado tu auto" + botón grande de WhatsApp.

### 6.3 Catálogo (`/baterias`)

Filtros por marca, medida y gama (en celular, botón "Filtrar" que abre un panel inferior). Grilla de tarjetas: 1 columna celular, 2 tablet, 3–4 escritorio.

### 6.4 Ficha de producto

Galería de fotos · marca · "12x65 · Reforzada" · precio y precio por transferencia · opción con o sin entrega de la usada · botón "Comprar" · bloque de servicio incluido · especificaciones (amperaje, CCA, medida) · "Autos compatibles" · explicación de la gama · WhatsApp.

### 6.5 Checkout (una sola página)

1. Resumen del producto (colapsable en celular).
2. **Tus datos:** nombre y apellido, DNI, teléfono, mail, cada uno con su explicación.
3. **Entrega:** dos opciones grandes tipo tarjeta: "Colocación a domicilio" (pide dirección, zona y referencias) o "Retiro en el local" (muestra dirección y horarios).
4. **Pago:** Mercado Pago, Transferencia (muestra el ahorro), Efectivo al retirar (solo si elige retiro).
5. Total desglosado y botón "Confirmar compra".
6. Texto de privacidad con link.

Sin menú ni WhatsApp flotante para no distraer. Indicador de "Compra segura" con candado.

### 6.6 Pedido recibido y seguimiento

Número de pedido grande, estado actual con línea de tiempo, resumen, y si es transferencia: CBU/alias, titular y monto con botones "Copiar". Botón de WhatsApp.

### 6.7 Quiénes somos y Contacto

Historia y 45 años, fotos del equipo y del local. Contacto con mapa, horarios, dirección y WhatsApp.

### 6.8 Panel (`/panel`)

Interfaz más sobria: fondo blanco, negro para navegación, rojo solo en la acción principal.

* **Ingreso:** campo de mail y "Enviarme el link".
* **Pedidos:** lista con número, auto, entrega, estado (chip) y hora; filtros por estado. En celular, tarjetas.
* **Detalle de pedido:** datos del comprador con DNI, botones "Abrir en el mapa", "WhatsApp", "Confirmar transferencia" y selector de estado.
* **Productos:** lista con buscador, precio y stock editables en la fila, interruptor activo/pausado, fotos.
* **Configuración:** descuento por transferencia, datos bancarios, horarios, WhatsApp, zonas.
* Navegación: barra lateral negra en escritorio, barra inferior con 3 íconos en celular.

---

## 7. Estados que tiene que tener cada pantalla

Cargando (esqueleto gris, no spinner solo), vacío (con mensaje y acción), error (qué pasó y cómo seguir), sin stock, éxito. Ningún estado deja al cliente sin una salida: siempre hay WhatsApp o un botón para volver.

## 8. Accesibilidad

* Contraste según §2.3; texto mínimo 16 px (17 px en general).
* Todo usable con teclado y con foco visible.
* Imágenes de producto con texto alternativo ("Batería Sermat 12x65 reforzada").
* El estado nunca se comunica solo por color: chip con texto.
* Animaciones cortas (150–250 ms) y respetando "reducir movimiento".

---

## 9. Prompt para generadores de interfaz (Google Stitch, v0, Lovable…)

```text
Design a mobile-first e-commerce web app for "La Casa de las Baterías", a 45-year-old car battery shop in Mar del Plata, Argentina. All UI copy in Rioplatense Spanish (voseo). Users search their car (brand → model → year), see only compatible batteries, buy as guest in one page, and choose home installation or store pickup.

Brand: italic heavy "CB" monogram where the C is a battery cell with a lightning bolt inside; logotype "LA CASA DE LAS BATERÍAS" in condensed italic uppercase with "CASA" and "BATERÍAS" in red. Slogan: "45 AÑOS CARGANDO CONFIANZA." Value props: "Baterías con garantía" (shield icon), "Marcas nacionales" (Argentina flag icon), "Con o sin colocación" (lightning icon). Brands sold: Sermat, Edna, Herbo, Volta. Address: Av. Juan B. Justo 5766, Mar del Plata.

Colors: red #FF2610, orange #FF4E10, black #0B0B0B, white #FFFFFF. Brand gradient linear-gradient(90deg, #FF2610, #FF4E10) on large surfaces only (hero bands, value-prop strip, brand labels), always with a subtle repeated rounded lightning-bolt pattern on top. Flat colors on buttons and inputs. One red action per screen. Small red text on white uses #D41A00.

Typography: "Sport Headline" (heavy sporty italic display, uppercase) for short impact headlines, labels and brand names; Montserrat for body, UI and the slogan, sentence case, 17px minimum on mobile. If Sport Headline is unavailable, use Montserrat ExtraBold Italic for headlines. Signature shapes: slanted parallelogram labels in black or gradient, with a white rounded square holding the icon. Large touch targets (48px+), 56px tall inputs and buttons, 10px radius, 16px radius cards, soft shadows. Line icons (Lucide style), no emojis.

Screens: 1) Home: hero banner on white with grey halftone battery photos behind; centered H1 headline "45 AÑOS CARGANDO CONFIANZA" in heavy italic uppercase ("45 AÑOS" in red #FF2610, "CARGANDO CONFIANZA" in black; 3 lines on mobile, 2 on desktop); subheadline "Encontrá la batería justa para tu auto. Te la colocamos en Mar del Plata."; car search card (Marca, Modelo, Año) with red "Ver baterías para mi auto" button; WhatsApp link below; gradient band with the three value props in black slanted labels; 4-step how it works; economy vs heavy-duty comparison; brands section on black with gradient slanted labels; "45 AÑOS EN EL MERCADO" section; payment methods; footer with address. 2) Results for a car with product cards (photo, brand, "12x65 · Reforzada", list price, price with bank transfer discount, Comprar button) and empty state with WhatsApp CTA. 3) Product detail. 4) One-page checkout: personal data with helper text explaining why each field is requested (DNI, phone, address), delivery choice cards (home installation / store pickup), payment (Mercado Pago, bank transfer with discount, cash on pickup), total breakdown, "Confirmar compra". 5) Order confirmation with timeline and bank details with copy buttons. 6) Admin panel: orders list with status chips, order detail with "Abrir en el mapa", "WhatsApp", "Confirmar transferencia", products list with inline price and stock editing. Floating WhatsApp button except on checkout. Accessible, high contrast, designed for older users who rarely shop online.
```
