---
name: La Casa de las Baterías
description: Tienda online de baterías para auto en Mar del Plata; el mundo de los banners de la marca llevado a una interfaz clara para gente grande.
colors:
  rojo: "#FF2610"
  naranja: "#FF4E10"
  rojo-texto: "#D41A00"
  rojo-rayo: "#A81000"
  rojo-velo: "#FFF1EE"
  negro: "#0B0B0B"
  blanco: "#FFFFFF"
  gris-900: "#1C1C1C"
  gris-800: "#333333"
  gris-600: "#5C5C5C"
  gris-400: "#A6A6A6"
  gris-placeholder: "#767676"
  gris-300: "#D9D9D9"
  gris-200: "#EDEDED"
  gris-100: "#F4F4F4"
  verde-ok: "#187A33"
  amarillo-aviso: "#B87900"
  whatsapp: "#25D366"
typography:
  display:
    fontFamily: "Sport Headline Web, Montserrat, sans-serif"
    fontSize: "96px"
    fontWeight: 900
    lineHeight: 0.9
    letterSpacing: "0.02em"
  headline:
    fontFamily: "Sport Headline Web, Montserrat, sans-serif"
    fontSize: "72px"
    fontWeight: 900
    lineHeight: 0.9
  title:
    fontFamily: "Montserrat, sans-serif"
    fontSize: "24px"
    fontWeight: 800
    lineHeight: 1.2
  body:
    fontFamily: "Montserrat, sans-serif"
    fontSize: "17px"
    fontWeight: 500
    lineHeight: 1.55
  body-lg:
    fontFamily: "Montserrat, sans-serif"
    fontSize: "20px"
    fontWeight: 500
    lineHeight: 1.5
  label:
    fontFamily: "Montserrat, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1.2
  price:
    fontFamily: "Montserrat, sans-serif"
    fontSize: "30px"
    fontWeight: 800
    lineHeight: 1
    fontFeature: "tnum"
rounded:
  cell: "3px"
  sm: "8px"
  md: "10px"
  opt: "12px"
  lg: "16px"
  pill: "999px"
spacing:
  gutter-m: "16px"
  gutter: "48px"
  gap-sm: "12px"
  gap-md: "24px"
  gap-lg: "40px"
  section: "104px"
  section-lg: "112px"
components:
  button-primary:
    backgroundColor: "{colors.rojo}"
    textColor: "{colors.blanco}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 28px"
    height: "56px"
  button-primary-hover:
    backgroundColor: "{colors.naranja}"
    textColor: "{colors.blanco}"
  button-primary-disabled:
    backgroundColor: "{colors.gris-300}"
    textColor: "{colors.gris-600}"
  button-light:
    backgroundColor: "{colors.blanco}"
    textColor: "{colors.negro}"
    rounded: "{rounded.md}"
    height: "56px"
  button-light-hover:
    backgroundColor: "{colors.negro}"
    textColor: "{colors.blanco}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.blanco}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 18px"
  button-ghost-hover:
    backgroundColor: "{colors.blanco}"
    textColor: "{colors.negro}"
  input:
    backgroundColor: "{colors.blanco}"
    textColor: "{colors.negro}"
    rounded: "{rounded.md}"
    height: "56px"
    padding: "0 16px"
  input-disabled:
    backgroundColor: "{colors.gris-100}"
    textColor: "{colors.gris-600}"
  tag-paralelogramo:
    backgroundColor: "{colors.negro}"
    textColor: "{colors.blanco}"
    padding: "8px 26px 8px 8px"
  icon-square:
    backgroundColor: "{colors.blanco}"
    textColor: "{colors.rojo}"
    rounded: "9px"
    size: "44px"
  step-number:
    backgroundColor: "{colors.negro}"
    textColor: "{colors.blanco}"
    rounded: "{rounded.pill}"
    size: "40px"
  card-product:
    backgroundColor: "{colors.blanco}"
    rounded: "{rounded.lg}"
  option-card:
    backgroundColor: "{colors.blanco}"
    rounded: "{rounded.opt}"
    padding: "20px"
  chip:
    backgroundColor: "{colors.gris-100}"
    textColor: "{colors.negro}"
    rounded: "{rounded.pill}"
    height: "34px"
    padding: "0 14px"
  filter-chip-active:
    backgroundColor: "{colors.negro}"
    textColor: "{colors.blanco}"
    rounded: "{rounded.pill}"
    height: "40px"
  status-pagado:
    backgroundColor: "{colors.verde-ok}"
    textColor: "{colors.blanco}"
    rounded: "{rounded.pill}"
    height: "28px"
  status-pendiente:
    backgroundColor: "{colors.amarillo-aviso}"
    textColor: "{colors.negro}"
    rounded: "{rounded.pill}"
    height: "28px"
  whatsapp-float:
    backgroundColor: "{colors.whatsapp}"
    textColor: "{colors.negro}"
    rounded: "{rounded.pill}"
    size: "64px"
---

# Design System: La Casa de las Baterías

<!-- Documentado a partir del build terminado: 12 tableros .dc.html en .impeccable/prototipo/ (6 web a 1440 px, 6 mobile a 390 px), revisión final con disposición ship. Donde el build difiere de DISENO_UI.md, este archivo describe el build. -->

## Overview

**Creative North Star: "El mostrador con banner"**

La tienda es el mundo de los banners impresos de la marca puesto a atender: campos en degradé rojo a naranja con rayos redondeados, losas negras, etiquetas en paralelogramo y titulares en itálica deportiva en mayúsculas. Esa voz de cartel es para lo que se lee de lejos (titulares, propuestas, marcas); todo lo que se toca o se lee de cerca va en Montserrat, en minúscula de oración, grande y con mucho contraste, porque el comprador incluye gente grande que usa poco internet.

La densidad es baja y el ritmo es de bloques: secciones blancas, negras y en degradé que se alternan a ancho completo, cada una con un solo mensaje. El blanco es el fondo de trabajo (buscador, fichas, checkout, panel); el negro y el degradé son los fondos de impacto. Las fotos son del usuario: baterías en gris con trama de puntos a los costados del hero y la foto de producto Sermat.

**Procedencia de los rasters (ninguno generado por IA):** isotipo CB extraído de los PNG del usuario (cb-color.png, cb-white.png, cb-tile.png); recortes en gris del banner 2 del usuario para los costados del hero (hero-left.png, hero-right.png); foto de producto Sermat provista por el usuario. Copias del isotipo y de los recortes en `.impeccable/refs/` (la foto Sermat vive como blob de la mesa de diseño); originales en `D:\diseños\la casa de las baterias`.

Lo operable es plano y generoso: campos y botones de 56 px, radios de 10 px, foco con contorno negro de 3 px. La profundidad es suave y escasa; la marca se expresa con color y forma, no con efectos.

**Key Characteristics:**
- Rojo #FF2610 y naranja #FF4E10 de la marca, siempre en pareja dentro del degradé de 90°; negro casi puro y blanco.
- Sport Headline itálica negra en mayúsculas para titulares cortos; Montserrat para el resto.
- Etiquetas en paralelogramo (sesgo de -12° en web, -10° en mobile) con ícono en cuadrado blanco redondeado.
- Patrón de rayos redondeados en rojo oscuro translúcido sobre todo campo en degradé.
- Íconos de línea estilo Lucide en SVG en línea, trazo 2.
- Objetivos táctiles de 48 px o más y texto de 15 px como mínimo (cuerpo de 17 px).

## Colors

Una paleta de marca de dos rojos encendidos sobre negro y blanco, con grises neutros para lo funcional y tres colores de estado.

### Primary
- **Rojo Casa** (rojo): botón principal, palabras destacadas de los titulares ("45 AÑOS", "CASA", "BATERÍAS"), íconos de check y de pagos, punto de los radios, inicio del degradé. Sobre blanco solo en tamaños grandes, íconos o como fondo con texto blanco grande o negro.
- **Naranja Carga** (naranja): hover del botón principal, fin del degradé, la palabra "Reforzada" sobre negro, enlaces en hover sobre negro y encabezados de columna del pie.
- **Rojo Texto** (rojo-texto): enlaces y texto rojo chico sobre blanco (descuento por transferencia, mensajes de error, borde de campo con error).
- **Rojo Rayo** (rojo-rayo): solo como relleno del patrón de rayos, al 22 % de opacidad sobre el degradé.
- **Velo Rojo** (rojo-velo): fondo de la fila seleccionada en las tablas del panel.

### Neutral
- **Negro Losa** (negro): texto principal, encabezado y pie, losas de impacto, tarjeta "Reforzada", números de pasos, bordes seleccionados.
- **Blanco** (blanco): fondo de trabajo, texto sobre negro y sobre degradé.
- **Grafito** (gris-900): cuadrados de íconos y hover de navegación sobre negro.
- **Separador oscuro** (gris-800): líneas divisorias sobre negro.
- **Gris Texto** (gris-600): texto secundario sobre blanco, encabezados de tabla, estado de campos deshabilitados.
- **Gris Tenue** (gris-400): texto legal y marcadores sobre negro.
- **Gris Placeholder** (gris-placeholder): texto de ejemplo dentro de campos.
- **Gris Borde** (gris-300): bordes de campos, tarjetas y opciones en reposo; fondo del botón deshabilitado.
- **Gris Celda** (gris-200): celdas vacías de la batería del buscador, separadores finos en blanco, tramos pendientes de la línea de tiempo.
- **Gris Fondo** (gris-100): fondo de foto de producto, chips y campos deshabilitados.

### Estados
- **Verde OK** (verde-ok): "Pagado" (fondo con texto blanco) y "Entregado" (contorno y texto verdes).
- **Amarillo Aviso** (amarillo-aviso): fondo de "Pendiente de pago", siempre con texto negro.
- **Verde WhatsApp** (whatsapp): solo el botón flotante, con ícono negro.

### Named Rules
**The Degradé Con Rayos Rule.** El degradé `linear-gradient(90deg, rojo, naranja)` solo cubre superficies de marca (banda de propuestas, sección de historia, etiquetas de marcas, celdas llenas y barras de progreso) y, cuando es un campo de sección, siempre lleva encima el patrón de rayos. Botones y campos son de color plano.

**The Rojo Chico Rule.** El rojo de marca sobre blanco no se usa para texto chico; para enlaces y textos de menos de 19 px en negrita va el rojo-texto.

**The Una Acción Roja Rule.** Cada vista tiene un solo botón rojo principal; las demás acciones son blancas, negras o fantasma.

## Typography

**Display Font:** Sport Headline (como "Sport Headline Web", Black Italic 900 y Bold Italic 700, con Montserrat de respaldo)
**Body Font:** Montserrat (400 a 800, más 800 y 900 itálica, desde Google Fonts)

**Character:** Una itálica deportiva, pesada y comprimida, que grita titulares de cartel, frente a una sans geométrica cálida que explica con calma. El contraste entre las dos es el sistema.

### Hierarchy
- **Display** (900 itálica, 96 px web / 44 px mobile, interlineado 0.9, mayúsculas): el slogan del hero y los grandes titulares de sección (hasta 104 px en "45 AÑOS EN EL MERCADO").
- **Headline** (900 itálica, 72 a 84 px web / 56 px mobile, 0.9, mayúsculas): títulos de sección ("Así de fácil", "Marcas nacionales"); 48 a 52 px para nombres de gama y de marcas dentro de etiquetas; 30 px en Bold Italic dentro de la etiqueta "Brindando el mejor servicio".
- **Title** (Montserrat 800, 20 a 24 px, 1.2): títulos de tarjetas, filas de servicio y del buscador; 700 a 22 px en los pasos; 800 a 34 px para títulos de sección operativos ("Pagás como te quede cómodo").
- **Body** (Montserrat 500, 17 px, 1.5 a 1.55): párrafos y descripciones; 19 a 20 px en bajadas, con medida máxima de 440 a 640 px.
- **Label** (Montserrat 700, 15 a 17 px, 1.2): rótulos de campos, chips, texto de botones (19 px en el botón principal).
- **Precio** (Montserrat 800, 30 px, números tabulares): precios en tarjetas; todo número (medidas, totales, CBU, tablas) usa `tabular-nums`.

### Named Rules
**The Cartel o Mostrador Rule.** Sport Headline solo para titulares cortos, nombres de marcas y etiquetas de cartel; nunca para párrafos, campos, botones ni el panel. Lo que se opera va en Montserrat, en minúscula de oración.

**The Diecisiete Rule.** El texto de lectura no baja de 17 px; 15 px es el piso para ayudas, estados y rótulos; 13 a 14 px solo para encabezados de tabla del panel y la línea legal.

## Layout

Contenedor de 1200 px centrado con márgenes laterales de 48 px en web y 16 px en mobile; un único corte en 860 px que apila las grillas en una columna. Las secciones van a sangre completa y alternan blanco, negro y degradé, con padding vertical de 104 a 112 px en web. La portada pone el buscador en el centro, bajo el slogan, con las fotos grises de baterías a los costados (al 75 % de opacidad en web, 35 % en mobile) y un velo radial blanco que despeja el centro; la banda en degradé con las tres propuestas cierra el primer viewport. Grillas: 4 columnas para los pasos, 2 para la comparación de gamas, 3 para pagos, 2 mitades para servicio. Huecos habituales de 12, 24 y 40 px. El panel web usa barra lateral negra y tablas; en mobile, listas apiladas.

## Elevation & Depth

Sistema mayormente plano, con sombras ambientales largas y suaves, siempre negras de baja opacidad y con dispersión negativa para que no ensucien el contorno. La sombra aparece en tres casos: la tarjeta del buscador (lo único que flota en el hero), la opción seleccionada y el hover de las tarjetas de producto. Los estados de contorno se resuelven con bordes, no con sombra.

### Shadow Vocabulary
- **Buscador** (`box-shadow: 0 24px 48px -24px rgba(11,11,11,.35), 0 2px 6px rgba(11,11,11,.06)`): la tarjeta del buscador sobre el hero.
- **Hover de tarjeta** (`box-shadow: 0 22px 40px -22px rgba(11,11,11,.35)`): tarjeta de producto en hover, junto con un ascenso de 2 px.
- **Seleccionado** (`box-shadow: 0 10px 24px -16px rgba(11,11,11,.4)`): opción elegida en ficha y checkout, junto con el borde negro de 2 px.
- **Caja de checkout** (`box-shadow: 0 2px 6px rgba(11,11,11,.05)`): bloques blancos del checkout sobre fondo gris.
- **Flotante** (`box-shadow: 0 12px 28px -10px rgba(0,0,0,.45)`): botón de WhatsApp.
- **Barra fija mobile** (`box-shadow: 0 -10px 24px -12px rgba(11,11,11,.3)`): barra de compra fija al pie en mobile.

### Named Rules
**The Solo Flota Lo Que Importa Rule.** En reposo, solo el buscador y el botón de WhatsApp tienen sombra; todo lo demás gana sombra por estado (hover o selección).

## Shapes

Esquinas suavemente redondeadas en lo operable (10 px en botones y campos, 12 px en opciones, 16 px en tarjetas y en el buscador), píldoras para chips y estados, círculos para números de pasos y radios. La única geometría angulosa es la de la marca: el paralelogramo sesgado de las etiquetas, con el contenido contra-sesgado para que el texto quede derecho. La batería del buscador es un dibujo de líneas: borde negro de 2.5 px, radio de 7 px, borne a la derecha y tres celdas de 3 px de radio. Bordes de 1.5 px en reposo, 2 px cuando algo está seleccionado o enfocado.

## Components

### Buttons
Firmes, grandes y de un solo color.
- **Shape:** esquinas suaves (10 px), alto de 56 px, ícono de 24 px a la izquierda con 10 px de separación.
- **Primary:** rojo con texto blanco Montserrat 700 de 19 px; ícono de rayo en "Ver baterías".
- **Hover / Focus:** pasa a naranja en 0.2 s con `cubic-bezier(.16,1,.3,1)`; al presionar baja 1 px; foco con contorno negro de 3 px a 2 px de distancia (blanco sobre fondos oscuros).
- **Light:** blanco con texto negro sobre negro; en hover se invierte.
- **Ghost:** transparente con contorno interior blanco de 2 px sobre negro, 44 a 48 px de alto ("Consultanos", "Botón de arrepentimiento").
- **Negro:** el principal con fondo negro, usado sobre el degradé ("Conocé nuestra historia").
- **Deshabilitado:** gris borde con texto gris, cursor no permitido.

### Etiqueta en paralelogramo (firma)
Losa negra sesgada (-12° web, -10° mobile) con un cuadrado blanco de 44 px y 9 px de radio que contiene el ícono en rojo, y el texto en Montserrat 700 de 19 px. Variante de marcas: la misma losa en degradé, de 380 px de ancho, con el nombre en Sport Headline de 52 px. Variante de lema: losa negra con Sport Headline Bold Italic de 30 px. Las propuestas de valor siempre van en esta etiqueta sobre la banda en degradé.

### Batería del buscador (firma)
Tres celdas dentro de un contorno de batería que pasan de gris celda al degradé a medida que se eligen marca, modelo y año (0.45 s, misma curva), acompañadas por el estado en vivo "Paso 1 de 3: elegí la marca". La línea de tiempo del pedido usa la misma idea en barras de 8 px: tramos hechos en degradé, tramo actual a rayas rojas.

### Cards / Containers
- **Corner Style:** 16 px.
- **Background:** blanco con borde gris de 1.5 px (producto, gama económica) o negro sin borde (gama reforzada, foto pendiente).
- **Shadow Strategy:** sin sombra en reposo; ver Elevation para hover.
- **Border:** 2 px negro en la tarjeta de gama económica.
- **Internal Padding:** 32 a 36 px; foto de producto en 4:3 sobre gris fondo.

### Opciones seleccionables
Tarjetas de 12 px de radio y 1.5 px de borde gris con un radio circular de 22 px a la izquierda; al elegirse, borde negro de 2 px, sombra de seleccionado y punto rojo de 10 px. Se usan para envío, pago y canje.

### Inputs / Fields
- **Style:** 56 px de alto, borde gris de 1.5 px, radio de 10 px, Montserrat 500 a 600 de 17 px; rótulo arriba en 700 y ayuda debajo en 15 px gris explicando por qué se pide el dato.
- **Focus:** borde negro de 2 px, sin halo.
- **Error / Disabled:** borde rojo-texto de 2 px con mensaje rojo con ícono; deshabilitado en gris fondo con texto gris.

### Chips y estados
Chips en píldora gris fondo (Montserrat 600, 15 px); filtros del panel en píldora de 40 px con borde gris, negros cuando están activos; estados de pedido en píldoras de 28 px: Pendiente de pago (amarillo, texto negro), Pagado (verde, texto blanco), En camino (negro), Listo para retirar (naranja, texto negro), Entregado (contorno verde). El contador de pedidos nuevos del panel usa la misma píldora en rojo con texto negro.

### Navigation
Encabezado negro de 80 px con isotipo CB y logotipo en Sport Headline (blanco con "Casa" y "Baterías" en rojo), enlaces Montserrat 600 de 16 px en blanco que pasan a naranja, botón fantasma "Consultanos" y carrito de 48 px. En mobile se ocultan los enlaces. Panel: barra lateral negra con ítems de 48 px; el activo va en blanco con texto negro.

### Pasos
Números en círculos negros de 40 px con Montserrat 800 blanco, unidos por una línea negra de 2 px; un halo blanco de 8 px corta la línea alrededor de cada círculo.

## Do's and Don'ts

### Do:
- **Do** poner el patrón de rayos redondeados (relleno rojo-rayo al 22 %, módulo de 96 px) sobre todo campo de sección en degradé.
- **Do** usar Sport Headline itálica en mayúsculas solo para titulares cortos y nombres de marcas, y destacar en rojo la palabra que carga el mensaje.
- **Do** mantener campos y botones en 56 px de alto y todo objetivo táctil en 48 px o más.
- **Do** acompañar cada dato que se pide con una ayuda en 15 px que explique para qué se usa.
- **Do** usar números tabulares en precios, medidas, totales y tablas.
- **Do** dejar siempre una salida a WhatsApp: botón flotante (salvo en checkout) o enlace bajo el buscador y los estados vacíos.
- **Do** usar solo rasters del usuario o derivados de sus archivos; si falta una foto, un marcador negro con ícono y texto entre corchetes.

### Don't:
- **Don't** poner el degradé en botones ni en campos; lo operable es de color plano.
- **Don't** usar el rojo de marca para texto chico sobre blanco; va el rojo-texto.
- **Don't** usar Sport Headline en párrafos, formularios, botones o el panel.
- **Don't** poner más de un botón rojo principal por vista.
- **Don't** abrir la portada con carrusel de ofertas o grilla de productos; el buscador por auto ocupa el centro.
- **Don't** usar emojis ni íconos de fuentes; los íconos son SVG de línea en línea.
- **Don't** inventar fotos de productos, del local o del equipo, ni precios o testimonios.
