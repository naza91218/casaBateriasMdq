# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Producto final: Next.js + TypeScript + PostgreSQL (ver `PLAN_TECNICO.md`). Prototipo de interfaz: mesa de diseño online (tableros estáticos en claude.ai), elegido por el usuario el 25/10/2026.

## Users

* **Comprador:** automovilista de Mar del Plata que necesita una batería, muchas veces con urgencia. Incluye gente grande que usa poco internet. No sabe qué medida lleva su auto. Compra desde el celular.
* **Mateo (administrador):** nieto del dueño; gestiona pedidos, precios, stock y fotos, y sale con la camioneta a colocar. Usa el panel desde el celular y la compu.

## Product Purpose

Tienda online propia de La Casa de las Baterías: el cliente busca su auto (marca, modelo, año), ve solo las baterías compatibles, compra en pocos pasos sin crear cuenta y elige colocación a domicilio o retiro en el local. Éxito: llegar a clientes nuevos que eligen por confianza y servicio, no por precio.

## Positioning

45 años en Mar del Plata y un servicio que la competencia cercana no da: **colocación a domicilio incluida en el precio**, medición del alternador y hasta 18 meses de garantía, con buscador por auto para que nadie tenga que saber medidas.

## Operating Context

* Local en Av. Juan B. Justo 5766, Mar del Plata. Competencia a una y dos cuadras.
* Marcas: Sermat, Edna, Herbo, Volta (nacionales). Medidas 12x65, 12x75, 12x90, 12x110, 12x160; gamas económica y reforzada.
* Pagos: Mercado Pago, transferencia con descuento, efectivo al retirar.
* Datos del comprador: nombre, DNI, teléfono, mail, dirección (para saber a dónde ir a colocar).
* WhatsApp como canal de consulta cuando el auto no aparece.

## Capabilities and Constraints

Requisitos funcionales completos en `specs/`. Colocación incluida en el precio (algunas zonas pueden tener costo extra). Sin cuentas de cliente. Indefinido: canje de la usada (P1), porcentaje de descuento por transferencia (P9), zonas de colocación (P8).

## Brand Commitments

* Nombre: **La Casa de las Baterías**. Isotipo **CB** (la C es una celda con un rayo). Slogan: **"45 AÑOS CARGANDO CONFIANZA"**.
* Colores: `#FF2610`, `#FF4E10`, blanco y negro; degradé rojo→naranja con patrón de rayos.
* Tipografías: **Sport Headline** (titulares; licencia web sin confirmar) y **Montserrat**.
* Propuestas de valor: Baterías con garantía · Marcas nacionales · Con o sin colocación (el cliente elige domicilio o retiro).
* Voz: voseo rioplatense, frases cortas, sin tecnicismos.
* Referencias binding: `D:\diseños\la casa de las baterias` (isotipo y banners) y `DISENO_UI.md`.

## Evidence on Hand

Isotipos y banners en `D:\diseños\la casa de las baterias`. No hay todavía fotos del local, del equipo ni de productos propios, ni testimonios, ni precios reales: no inventarlos; usar marcadores.

## Product Principles

1. El cliente nunca tiene que saber de baterías: el auto lleva a la batería.
2. El servicio es el diferencial y se ve en cada pantalla.
3. Nunca un callejón sin salida: siempre hay WhatsApp.
4. Pocos pasos y letra clara para quien usa poco internet.

## Accessibility & Inclusion

Usuarios mayores: texto mínimo 16–17 px, áreas táctiles ≥ 48 px, contraste WCAG AA, celular primero.
