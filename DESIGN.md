---
name: La Casa de las Baterías
description: Tienda online de baterías para auto en Mar del Plata; la voz de cartel de la marca puesta al servicio de una compra simple y legible para gente grande.
colors:
  rojo: "#FF2610"
  rojo-boton: "#E01E08"
  rojo-hover: "#C01805"
  naranja: "#FF4E10"
  rojo-texto: "#D41A00"
  campo: "#FF4318"
  campo-rayo: "#FF340D"
  rojo-velo: "#FFF1EE"
  negro: "#0B0B0B"
  blanco: "#FFFFFF"
  gris-900: "#1C1C1C"
  gris-800: "#333333"
  gris-600: "#5C5C5C"
  gris-400: "#A6A6A6"
  gris-300: "#D9D9D9"
  gris-200: "#EDEDED"
  gris-100: "#F4F4F4"
  verde-ok: "#187A33"
  amarillo-aviso: "#B87900"
  whatsapp: "#25D366"
typography:
  display:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "78px"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "0.005em"
  headline:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "56px"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "0.005em"
  title:
    fontFamily: "Barlow, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "Barlow, sans-serif"
    fontSize: "18px"
    fontWeight: 500
    lineHeight: 1.55
  body-lg:
    fontFamily: "Barlow, sans-serif"
    fontSize: "21px"
    fontWeight: 500
    lineHeight: 1.6
  label:
    fontFamily: "Barlow, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.2
  button:
    fontFamily: "Barlow, sans-serif"
    fontSize: "19px"
    fontWeight: 700
    lineHeight: 1.1
  logotipo:
    fontFamily: "Sport Headline Web, Barlow Condensed, sans-serif"
    fontSize: "18px"
    fontWeight: 900
    lineHeight: 0.95
    letterSpacing: "0.02em"
rounded:
  celda: "2px"
  sm: "4px"
  md: "6px"
  pill: "999px"
spacing:
  gutter-m: "16px"
  gutter: "48px"
  gap-sm: "12px"
  gap-md: "20px"
  gap-lg: "40px"
  section-m: "64px"
  section: "96px"
components:
  button-primary:
    backgroundColor: "{colors.rojo-boton}"
    textColor: "{colors.blanco}"
    typography: "{typography.button}"
    rounded: "{rounded.sm}"
    padding: "0 26px"
    height: "56px"
  button-primary-hover:
    backgroundColor: "{colors.rojo-hover}"
    textColor: "{colors.blanco}"
  button-dark:
    backgroundColor: "{colors.negro}"
    textColor: "{colors.blanco}"
    rounded: "{rounded.sm}"
    height: "56px"
  button-dark-hover:
    backgroundColor: "{colors.gris-800}"
  button-outline-dark-bg:
    backgroundColor: "transparent"
    textColor: "{colors.blanco}"
    rounded: "{rounded.sm}"
    height: "56px"
  button-outline-dark-bg-hover:
    backgroundColor: "{colors.blanco}"
    textColor: "{colors.negro}"
  button-outline-light-bg:
    backgroundColor: "{colors.blanco}"
    textColor: "{colors.negro}"
    rounded: "{rounded.sm}"
    height: "56px"
  button-outline-light-bg-hover:
    backgroundColor: "{colors.negro}"
    textColor: "{colors.blanco}"
  select:
    backgroundColor: "{colors.blanco}"
    textColor: "{colors.negro}"
    rounded: "{rounded.sm}"
    height: "60px"
    padding: "0 46px 0 16px"
  select-disabled:
    backgroundColor: "{colors.gris-100}"
    textColor: "{colors.gris-600}"
  step-number:
    backgroundColor: "{colors.negro}"
    textColor: "{colors.blanco}"
    rounded: "{rounded.sm}"
    size: "48px"
  icon-square:
    backgroundColor: "{colors.rojo}"
    textColor: "{colors.blanco}"
    rounded: "{rounded.sm}"
    size: "56px"
  check-mark:
    backgroundColor: "{colors.rojo}"
    textColor: "{colors.blanco}"
    rounded: "{rounded.sm}"
    size: "24px"
  card:
    backgroundColor: "{colors.blanco}"
    rounded: "{rounded.md}"
    padding: "36px"
  card-dark:
    backgroundColor: "{colors.negro}"
    textColor: "{colors.blanco}"
    rounded: "{rounded.md}"
    padding: "36px"
  header:
    backgroundColor: "{colors.blanco}"
    textColor: "{colors.negro}"
    height: "72px"
  slogan-tag:
    backgroundColor: "{colors.blanco}"
    textColor: "{colors.negro}"
    padding: "8px 16px"
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

<!-- Documentado el 02/11/2026 a partir de la portada en Next.js (frontend/src), propuesta 2, diseñada con la skill ui-ux-pro-max. Fusión con el sistema anterior (tableros aprobados el 26/10/2026): se conservan la paleta, el isotipo, los rayos, la voz y los componentes del panel que todavía no se reconstruyeron. Se reemplazan la tipografía, las formas, la profundidad y los componentes de la tienda. -->

## Overview

**Creative North Star: "Cartel de servicio"**

La voz fuerte de la marca (negro, rojo y el patrón de rayos del isotipo) puesta al servicio de una compra simple. Los banners impresos del local son la fuente de esa voz, pero la página no los imita: dice primero qué se compra y qué se recibe ("La batería de tu auto, colocada en tu casa"), muestra las baterías reales a todo color y deja la acción a la vista. El cartel aporta energía. El servicio aporta el orden.

El diseño es plano, con la lógica de "confianza y conversión" de un servicio local: colores sólidos, sin degradés ni sombras, líneas limpias y mucho aire. Las secciones van a ancho completo y alternan blanco, gris claro, negro con rayos y un solo campo rojo con rayos, cada una con un solo mensaje. Lo que se lee de lejos (titulares) va en Barlow Condensed en mayúsculas. Lo que se lee de cerca y se toca va en Barlow, grande y con mucho contraste, porque entre los compradores hay mucha gente grande.

La propuesta anterior (tríptico tipo banner, campo naranja al centro con las baterías en penumbra) se descartó el 02/11/2026: el usuario dijo que no lo convencía para nada.

**Key Characteristics:**
- Rojo de marca para la acción y los íconos; negro y blanco para todo lo demás; un solo campo rojo por página.
- Patrón de rayos del isotipo como textura del negro (hero, cierre) y del campo rojo (historia).
- Barlow Condensed 800 en mayúsculas para titulares; Barlow 500 a 18 px para el texto.
- Esquinas casi rectas (4 a 6 px), bordes de 2 px y nada de sombras.
- Baterías reales recortadas, a todo color.
- Objetivos táctiles de 48 px o más; selectores de 60 px y botones de 56 px.

## Colors

Dos rojos de marca sobre negro y blanco, con grises para lo funcional y tres colores de estado.

### Primary
- **Rojo Casa** (rojo): íconos en cuadrado, marcas de check, celdas cargadas de la batería del buscador y palabras destacadas grandes. Es el rojo del isotipo.
- **Rojo Acción** (rojo-boton): fondo del botón principal. Es un punto más oscuro que el Rojo Casa para que el texto blanco llegue a 4,8:1. En hover pasa a **Rojo Presionado** (rojo-hover).
- **Rojo Texto** (rojo-texto): enlaces y texto rojo chico sobre blanco, mensajes de error y palabras destacadas sobre gris claro.
- **Naranja Carga** (naranja): palabras destacadas de los titulares sobre negro ("colocada en tu casa", "nacionales", "lleva tu auto?"), el nombre de la gama reforzada y las marcas de check sobre negro.

### Secondary
- **Campo Naranja** (campo): el único campo de color de la página (la sección de historia). Siempre lleva encima el patrón de rayos en **Rayo del Campo** (campo-rayo). También es el color de la losa en paralelogramo detrás de las baterías del hero.

### Neutral
- **Negro Losa** (negro): texto principal, hero, banda de marcas, tarjeta reforzada, cierre y pie; números de pasos y bordes de las tarjetas.
- **Blanco** (blanco): fondo de trabajo, encabezado, tarjeta del buscador, fondo de las fotos de marcas y texto sobre negro.
- **Grafito** (gris-900): base de las tarjetas de marca sobre negro.
- **Separador oscuro** (gris-800): líneas sobre negro y hover del botón negro.
- **Gris Texto** (gris-600): texto secundario sobre blanco y gris claro (6,4:1).
- **Gris Tenue** (gris-400): marcadores entre corchetes sobre negro y la línea legal.
- **Gris Claro** (gris-300): texto secundario sobre negro y borde de los selectores en reposo.
- **Gris Borde** (gris-200): bordes de las tarjetas de pago, separadores finos y celdas vacías de la batería.
- **Gris Fondo** (gris-100): fondo de la sección del buscador y de la comparación de gamas, y selectores deshabilitados.

### Estados (panel, sin reconstruir todavía)
- **Verde OK** (verde-ok): "Pagado" y "Entregado".
- **Amarillo Aviso** (amarillo-aviso): "Pendiente de pago", siempre con texto negro.
- **Velo Rojo** (rojo-velo): fila seleccionada en las tablas del panel.
- **Verde WhatsApp** (whatsapp): solo el botón flotante, con ícono negro.

### Named Rules
**The Un Campo Rule.** Cada página tiene un solo campo de color (Campo Naranja con rayos). El resto alterna blanco, gris claro y negro con rayos.

**The Rojo Que Actúa Rule.** El rojo de fondo es para la acción principal y para los íconos que la acompañan. El botón principal va en Rojo Acción, nunca en el Rojo Casa más claro.

**The Rojo Chico Rule.** Para texto rojo de menos de 24 px sobre blanco o gris claro va el Rojo Texto.

## Typography

**Display Font:** Barlow Condensed (800, normal e itálica), servida con next/font
**Body Font:** Barlow (400 a 700), servida con next/font
**Logotipo:** Sport Headline Black Italic, solo en el nombre del logo, instalada localmente con `local()` mientras no esté la licencia web. Si no está instalada, cae en Barlow Condensed itálica.

**Character:** Una condensada de cartel deportivo, firme y en mayúsculas, sobre una sans humanista de lectura clara. Es el par "Sports" de ui-ux-pro-max y no tiene problema de licencia para la web.

### Hierarchy
- **Display** (Barlow Condensed 800, 46 px celular / 72 a 78 px escritorio, interlineado 0.95, mayúsculas): el titular del hero y "45 años en el mercado" (52 / 88 px).
- **Headline** (Barlow Condensed 800, 38 px celular / 56 px escritorio, 0.95, mayúsculas): títulos de sección. El título del buscador va a 52 px y los nombres de gama a 36 / 44 px.
- **Title** (Barlow 700, 21 a 22 px, 1.2): títulos de beneficios, pasos, gamas y medios de pago.
- **Body** (Barlow 500, 18 px, 1.55): párrafos, con medida máxima de 36 a 60 caracteres según el bloque. Bajada del hero a 19 / 21 px.
- **Label** (Barlow 700, 17 px): rótulos de los selectores, marcas de confianza y enlaces del encabezado.
- **Button** (Barlow 700, 19 px; 17 px en el encabezado).

### Named Rules
**The Cartel Corto Rule.** Barlow Condensed en mayúsculas solo para titulares y nombres de marcas o gamas. Nada que se opere (botones, campos, rótulos, panel) va en condensada.

**The Dieciocho Rule.** El texto de lectura no baja de 18 px; 16 px es el piso para ayudas y errores, y 14 a 15 px solo para la línea legal y el número dentro del paso.

## Layout

Contenedor de 1200 px centrado, con márgenes laterales de 48 px en escritorio y 16 px en celular. Hay dos cortes: a 860 px las grillas pasan de una columna a varias, y a 1200 px aparece la navegación completa del encabezado (debajo, menú desplegable). Las secciones van a ancho completo con 64 px de padding vertical en celular y 96 px en escritorio.

Orden de la portada:
1. Hero en dos columnas: texto y acciones a la izquierda, baterías a la derecha.
2. Buscador sobre gris claro, en una tarjeta de hasta 1104 px.
3. Beneficios en 4 columnas.
4. Marcas en 4 tarjetas (2 en celular).
5. Cómo funciona, en 4 pasos.
6. Gamas en 2 columnas.
7. Historia en 2 columnas sobre el campo rojo.
8. Pagos en 3 columnas.
9. Cierre, en una franja negra.

Huecos habituales de 12, 20 y 40 px. El encabezado queda fijo arriba, y el anclaje compensa su alto con 88 px de `scroll-padding-top`.

## Elevation & Depth

El sistema es plano: no hay sombras. La profundidad sale del contraste entre fondos (blanco, gris claro, negro, campo), de los bordes de 2 px y del patrón de rayos.

La única superposición es de forma, no de luz: las dos baterías del hero se apoyan sobre una losa en paralelogramo color campo, y la etiqueta del slogan se monta sobre ese borde.

### Named Rules
**The Plano Rule.** Nada lleva `box-shadow` de elevación. El único uso de sombra es un halo blanco de 10 px que corta la línea de pasos alrededor de cada número, y es un recurso de forma.

## Shapes

Esquinas casi rectas en todo lo que se toca:
- 4 px en botones, selectores, íconos en cuadrado y marcas de check;
- 6 px en tarjetas;
- 2 px en las celdas de la batería;
- píldora solo para el botón de WhatsApp y los estados del panel.

Los bordes son de 2 px. Negro en las tarjetas que se destacan y en la del buscador, y gris en las de pago y en los selectores en reposo.

La geometría de la marca es el paralelogramo sesgado −10° (losa detrás de las baterías, etiqueta del slogan), con el contenido contra-sesgado para que el texto quede derecho. El patrón de rayos repite el rayo del isotipo en la grilla de los fondos del usuario: 5 columnas por baldosa, de 210 × 60 px en escritorio y 168 × 48 px en celular.

## Components

### Buttons
Firmes y planos: un solo color, esquinas casi rectas y el hover que solo cambia el color.
- **Forma:** 4 px de radio, 56 px de alto (48 px en el encabezado), 26 px de padding lateral. Ícono de 22 px a la izquierda, con 10 px de separación.
- **Principal:** Rojo Acción con texto blanco.
- **Hover / Focus:** pasa a Rojo Presionado en 0,15 s. El foco es un contorno negro de 3 px a 2 px de distancia, blanco sobre fondos oscuros.
- **Negro:** fondo negro, para el campo rojo y como salida por WhatsApp cuando el buscador no carga.
- **Contorno sobre oscuro:** transparente con contorno blanco de 2 px; en hover se rellena de blanco. Se usa para "Escribinos por WhatsApp" en el hero y en el cierre.
- **Contorno sobre claro:** blanco con contorno negro de 2 px; en hover se rellena de negro. Se usa en el menú del celular.

### Cards / Containers
- **Corner Style:** 6 px.
- **Background:** blanco con borde negro de 2 px (buscador, gama económica), negro sin borde (gama reforzada) o blanco con borde gris de 2 px (pagos).
- **Shadow Strategy:** ninguna (ver Elevation).
- **Internal Padding:** 24 px en celular y 32 a 36 px en escritorio.
- **Tarjeta de marca:** foto en 4:3 sobre blanco y el nombre en condensada sobre grafito. Si falta la foto, un marcador gris con ícono y el texto entre corchetes.

### Inputs / Fields
- **Style:** selectores nativos de 60 px, borde gris de 2 px, radio de 4 px, Barlow 600 de 18 px y flecha propia. El rótulo va arriba, en 17 px, con el número del paso en un cuadrado negro de 28 px.
- **Focus:** el borde pasa a negro.
- **Error / Disabled:** el error es un borde Rojo Texto con el mensaje debajo, que el lector de pantalla anuncia. Deshabilitado es gris fondo con texto gris.

### Navigation
- **Encabezado:** blanco, fijo y de 72 px (64 px en celular), con borde inferior gris. Lleva el logo (isotipo en degradé y nombre en Sport Headline), los enlaces en Barlow 600 de 17 px (pasan a Rojo Texto en hover), "Consultanos" con ícono, el botón rojo "Buscar mi batería" y el carrito de 48 px.
- **Debajo de 1200 px:** un botón de menú de 48 px que despliega los enlaces en filas de 56 px y dos botones de ancho completo.

### Batería del buscador (firma)
Un contorno de batería de 76 × 30 px con tres celdas que pasan de gris borde a Rojo Casa al elegir marca, modelo y año, al lado del estado en vivo ("Paso 1 de 3: elegí la marca"). Si el modelo no distingue años, la tercera celda se carga con el modelo.

### Marcas de confianza
Cuadrado de 24 px (naranja sobre negro, rojo sobre blanco) con un check, seguido de la frase en Barlow 600. Van en el hero (colocación incluida, 12 meses de garantía, marcas nacionales) y en las listas de gamas.

### Estados de pedido (panel, del sistema anterior)
Píldoras de 28 px: Pendiente de pago (amarillo, texto negro), Pagado (verde, texto blanco), En camino (negro), Listo para retirar (naranja, texto negro) y Entregado (contorno verde).

## Do's and Don'ts

### Do:
- **Do** decir en el titular del hero qué se compra y qué se recibe, con las baterías reales a todo color al lado.
- **Do** usar Rojo Acción (#E01E08) para el botón principal, así el texto blanco llega a 4,8:1.
- **Do** mantener botones de 56 px, selectores de 60 px y todo objetivo táctil en 48 px o más.
- **Do** poner el patrón de rayos sobre el negro del hero y del cierre, y sobre el único campo rojo.
- **Do** dejar siempre una salida a WhatsApp: botón flotante (que se aparta en el celular mientras se ve el buscador), enlace bajo el buscador y botón de cierre.
- **Do** usar solo fotos del usuario o derivadas de sus archivos; si falta una, un marcador con el texto entre corchetes.
- **Do** usar números tabulares en precios, medidas, totales y tablas.

### Don't:
- **Don't** usar sombras de elevación ni degradés en superficies o botones (la única excepción es el degradé del isotipo).
- **Don't** poner más de un campo de color por página.
- **Don't** usar Barlow Condensed en párrafos, botones, campos o en el panel.
- **Don't** oscurecer ni desaturar las fotos de producto (lo que se descartó con el tríptico).
- **Don't** abrir la portada con carrusel de ofertas o grilla de productos.
- **Don't** usar emojis ni íconos de fuentes; los íconos son de línea, de Lucide, con trazo 2.
- **Don't** inventar fotos de productos, del local o del equipo, ni precios o testimonios.
