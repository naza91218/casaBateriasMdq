# PROCESO DE DESARROLLO — Tienda online de baterías (Mar del Plata)

> * **Estado:** borrador inicial, pendiente de respuestas del cliente (ver §10).
> * **Fecha:** 08/10/2026
> * **Escala:** **Chico** en alcance (1 dev, < 20 días, USD [monto]), con lineamientos de arquitectura de **Mediano** reducidos a lo justo para poder crecer (ver §2.3).
> * **Desarrollador:** Nazareno

---

## 0. Contexto

| Tema | Detalle |
| :- | :- |
| Negocio | Venta de baterías automotor. Local físico con muchos años, conocido en Mar del Plata. |
| Contacto | El nieto del dueño. También va a administrar la tienda. |
| Situación digital | Sin presencia: no tiene logo, dominio ni redes. No lleva registro formal de stock ni precios. |
| Clientes | Solo consumidor final, con precio único. |
| Objetivo | Tienda online para vender y cobrar, con una base que permita crecer (más funciones, más volumen) sin rehacerla. |
| Restricciones | 1 desarrollador, salida en menos de 20 días, presupuesto de desarrollo USD [monto]. |
| Trabajo aparte (no incluido) | Logo e identidad, diseño de redes, carga del catálogo (a definir, §10). |

---

## 1. Alcance

### 1.1 Fase 1 (este presupuesto)

1. Catálogo con filtros por especificación (marca, amperaje, CCA, medidas, borne).
2. **Buscador por vehículo:** marca → modelo → años → baterías compatibles.
3. Ficha de producto con variante **con o sin entrega de la batería usada** (si el cliente lo confirma, §10).
4. Carrito y checkout como invitado (sin cuentas de cliente).
5. Pagos: **Mercado Pago**, **transferencia** (con descuento) y **pago en el local** (solo con retiro).
6. Entregas: **retiro en el local** y **envío en Mar del Plata** con tarifa propia.
7. Mails de pedido (confirmación y cambios de estado).
8. Botón de WhatsApp de asesoramiento ("no sé qué batería lleva mi auto").
9. Páginas legales y botón de arrepentimiento.
10. **Panel simple para el cliente** (Next.js, ver §5) con productos y pedidos.

### 1.2 Fuera de alcance (fase 2 o posterior, ver §8)

Envío nacional, facturación electrónica de ARCA, cuentas de cliente, MercadoLibre, mayoristas, varios depósitos.

---

## 2. Arquitectura

### 2.1 Vista general

```text
Comprador ──► Tienda WordPress + WooCommerce (hosting WP) ◄──► Mercado Pago (plugin oficial)
                         ▲
                         │ API REST de WooCommerce + API de medios de WordPress
                         │ (claves solo en el servidor del panel)
                         │
Nieto ─────► Panel simple Next.js (Netlify) ── login propio
Desarrollador ► wp-admin completo (configuración, plugins, casos raros)
```

### 2.2 Componentes

| Componente | Tecnología | Responsabilidad |
| :- | :- | :- |
| Tienda | WordPress + WooCommerce, tema liviano compatible (Kadence o Astra) | Catálogo público, carrito, checkout, pedidos, stock, mails. **Fuente única de verdad.** |
| Pagos | Plugin oficial de Mercado Pago, más los métodos nativos de WooCommerce (transferencia, pago al retirar) | Cobro y notificación de pago |
| Buscador por vehículo | Taxonomía propia `vehiculo` (marca > modelo con rango de años), con `show_in_rest`, más un selector de 3 pasos | Compatibilidad batería ↔ vehículo |
| Panel | Next.js (App Router) + Auth.js, desplegado en Netlify | Interfaz simple para precios, stock, fotos y pedidos |
| Hosting WP | Hosting argentino con SSL, PHP actualizado y backups | — |

### 2.3 Lineamientos (lo mínimo para poder crecer)

1. **WooCommerce es la única fuente de verdad.** El panel no tiene base de datos propia: todo lo lee y lo escribe por la API. No hay datos duplicados que sincronizar.
2. **Las claves no salen del servidor.** Las claves de WooCommerce y la contraseña de aplicación de WordPress se usan solo en route handlers o server actions del panel. El navegador solo habla con el panel.
3. **Capas del panel:** `app/` (pantallas) → `acciones/` (server actions: validación y permisos) → `servicios/` (casos de uso: "marcar transferencia recibida") → `woo/` (cliente HTTP de la API). Las pantallas nunca llaman a la API directamente.
4. **Un módulo por recurso:** `productos`, `pedidos`, `vehiculos`. Cada uno con su servicio y su cliente.
5. **Compatibilidad expuesta por la API:** la taxonomía `vehiculo` se registra con `show_in_rest`. No se usan plugins que guarden datos en tablas sin API.
6. **Pocos plugins y de buena reputación.** Cada plugin se anota en §9 con su motivo.
7. **Todo lo que crece se agrega, no se reescribe:** envío nacional y facturación entran como plugins o métodos nuevos de WooCommerce; un frontend propio a futuro usa la misma API.

---

## 3. Modelo de datos (en WooCommerce)

| Concepto | Cómo se modela |
| :- | :- |
| Batería | Producto. **Variable** si se confirma el canje (variantes "con entrega de la usada" / "sin entrega"); si no, producto simple. SKU obligatorio. |
| Especificaciones | Atributos globales: `marca`, `amperaje`, `cca`, `medidas`, `borne`, `garantia`. |
| Compatibilidad | Taxonomía jerárquica `vehiculo`: Marca → Modelo (años), por ejemplo `Volkswagen → Gol Trend (2008–2023)`. Se asigna a cada producto. |
| Stock | Gestión de stock de WooCommerce por producto o variante. Se descuenta al confirmarse el pago o al poner el pedido en espera. |
| Pedidos | Estados de WooCommerce: *Pendiente de pago* → *En espera* (transferencia o pago en el local) → *Procesando* (pagado) → *Completado* (entregado). Opcional: estado propio *Listo para retirar*. |
| Entrega | Métodos de envío: *Retiro en el local* (gratis) y *Envío Mar del Plata* (tarifa fija o por zona). |
| Pago | *Mercado Pago*, *Transferencia* (BACS, con descuento), *Pago en el local* (solo habilitado con *Retiro en el local*). |

**Planilla maestra del catálogo** (CSV): SKU, nombre, marca, amperaje, CCA, medidas, borne, garantía, precio, precio con canje, stock, vehículos compatibles, foto. Es el activo del negocio: se importa a WooCommerce y sirve para MercadoLibre o una migración futura.

---

## 4. Páginas de la tienda

| Página | Contenido |
| :- | :- |
| Inicio | Buscador por vehículo destacado, marcas, más vendidas, servicios, ubicación, WhatsApp |
| Catálogo | Listado con filtros por especificación |
| Resultado por vehículo | Baterías compatibles con el vehículo elegido; si no hay, se deriva a WhatsApp |
| Producto | Fotos, especificaciones, vehículos compatibles, variante con o sin canje, garantía |
| Carrito / Checkout | Datos del comprador, método de entrega y método de pago |
| Pedido recibido | Resumen; si es transferencia, datos bancarios e instrucciones |
| Contacto y ubicación | Mapa, horarios, teléfono, WhatsApp |
| Legales | Términos y condiciones, política de privacidad, **botón de arrepentimiento**, datos del comercio |

---

## 5. Panel simple (Next.js en Netlify)

| Sección | Acciones |
| :- | :- |
| Ingreso | Usuario y contraseña (Auth.js). Un solo rol al inicio, preparado para sumar más. |
| Pedidos | Lista de pedidos nuevos; ver detalle; **marcar transferencia recibida**; cambiar estado (listo para retirar, entregado). |
| Productos | Buscar; editar precio y stock; activar o pausar; subir foto. |
| Vehículos | Asignar o quitar vehículos compatibles a una batería. *(Si no entra en tiempo, pasa a fase 2 y se hace desde wp-admin.)* |

**Plan B:** si el panel no llega a tiempo, el cliente arranca con wp-admin simplificado (rol "Gestor de tienda" que solo ve Productos y Pedidos, más una guía con capturas) y el panel se entrega después.

---

## 6. Plan de tareas

Formato: `T<capítulo>.<n>`, con **Hecho cuando** verificable. Duración estimada: ~20 días corridos.

### Capítulo 1 — Preparación (días 1–2)

| Tarea | Descripción | Hecho cuando |
| :- | :- | :- |
| T1.1 | Dominio, hosting y cuenta de Mercado Pago **a nombre del cliente**, con el desarrollador como colaborador | El cliente tiene acceso a las tres cuentas y el desarrollador tiene acceso delegado |
| T1.2 | Instalar WordPress + WooCommerce, SSL, backups automáticos, plugin de SMTP | El sitio carga por HTTPS, hay un backup restaurable y un mail de prueba llega |
| T1.3 | Tema, identidad básica (colores, tipografía, logo provisorio) | La home muestra el esqueleto con la identidad aplicada |
| T1.4 | Repositorio del panel, Next.js, despliegue en Netlify | Un push a `main` despliega en Netlify y la página de ingreso se ve |

### Capítulo 2 — Catálogo y buscador (días 3–7)

| Tarea | Descripción | Hecho cuando |
| :- | :- | :- |
| T2.1 | Atributos globales y taxonomía `vehiculo` (mu-plugin, `show_in_rest`) | La taxonomía aparece en wp-admin y en `/wp-json/wp/v2/` |
| T2.2 | Planilla maestra CSV y plantilla de importación | Se importan 5 productos de prueba con atributos, variantes y vehículos |
| T2.3 | Buscador por vehículo (selector marca → modelo) | Elegir un vehículo lista solo las baterías compatibles; sin resultados, ofrece WhatsApp |
| T2.4 | Catálogo con filtros y ficha de producto | Se puede filtrar por amperaje y marca; la ficha muestra especificaciones y vehículos |

### Capítulo 3 — Compra (días 8–11)

| Tarea | Descripción | Hecho cuando |
| :- | :- | :- |
| T3.1 | Métodos de entrega (retiro, envío MdP) | El checkout ofrece los dos y calcula la tarifa |
| T3.2 | Mercado Pago en modo prueba | Una compra de prueba aprobada deja el pedido en *Procesando* y descuenta stock; una rechazada no descuenta |
| T3.3 | Transferencia con descuento y pago en el local (solo con retiro) | Transferencia deja el pedido *En espera* con los datos bancarios; pago en el local no aparece si se elige envío |
| T3.4 | Mails de pedido personalizados | Comprador y comercio reciben el mail en cada cambio de estado |

### Capítulo 4 — Panel (días 12–16)

| Tarea | Descripción | Hecho cuando |
| :- | :- | :- |
| T4.1 | Login y protección de rutas | Sin sesión, cualquier ruta redirige al ingreso; las claves no aparecen en el bundle del navegador |
| T4.2 | Cliente `woo/` y servicios | Los servicios leen y escriben productos y pedidos, con tests unitarios del mapeo |
| T4.3 | Pedidos | El nieto ve los pedidos nuevos y marca una transferencia como recibida (pasa a *Procesando*) |
| T4.4 | Productos | Cambiar precio o stock en el panel se refleja en la tienda; se puede subir una foto |
| T4.5 | Vehículos (si entra) | Asignar un vehículo a una batería la hace aparecer en el buscador |

### Capítulo 5 — Legal y contenido (días 17–18)

| Tarea | Descripción | Hecho cuando |
| :- | :- | :- |
| T5.1 | Términos, privacidad, botón de arrepentimiento, datos del comercio | Las páginas están publicadas y enlazadas en el pie, con razón social y CUIT reales |
| T5.2 | WhatsApp, Google Analytics y Meta Pixel | El botón abre el chat con un mensaje precargado; Analytics registra visitas |

### Capítulo 6 — Salida (días 19–20)

| Tarea | Descripción | Hecho cuando |
| :- | :- | :- |
| T6.1 | Prueba completa de punta a punta (§7) | Toda la checklist de §7 pasa |
| T6.2 | Mercado Pago a producción y compra real de bajo monto | Una compra real se acredita y se reintegra |
| T6.3 | Guía de uso para el nieto (panel + casos frecuentes) | El nieto carga un producto y gestiona un pedido sin ayuda |
| T6.4 | Entrega: accesos, backups, documento de soporte | El cliente confirma la entrega por escrito |

---

## 7. Verificación

**Checklist de compra (manual, en modo prueba y luego en producción):**

- [ ] Buscar un vehículo → elegir batería → comprar con Mercado Pago → pedido *Procesando*, stock descontado, mails enviados.
- [ ] Pago rechazado de Mercado Pago → pedido no queda pagado y el stock no cambia.
- [ ] Transferencia → pedido *En espera* → marcar recibida desde el panel → *Procesando*.
- [ ] Pago en el local solo disponible con retiro.
- [ ] Producto sin stock no se puede comprar.
- [ ] Botón de arrepentimiento funciona y llega al comercio.
- [ ] Sitio y panel usables desde el celular.

**Panel:** lint y build en cada deploy de Netlify, tests unitarios de `servicios/` y `woo/`.

---

## 8. Fase 2 y crecimiento

| Mejora | Cómo entra |
| :- | :- |
| Envío nacional | Plugin de transportista, una vez confirmado que acepta baterías de plomo-ácido |
| Facturación electrónica (ARCA) | Plugin de facturación conectado a WooCommerce |
| MercadoLibre | Sincronización de stock con la planilla y WooCommerce |
| Panel ampliado | Vehículos, reportes de ventas, más usuarios |
| Frontend propio | Next.js usando WooCommerce como backend por API, si el volumen o el diseño lo justifican |

**Soporte:** mensualidad para hosting, backups, actualizaciones de WordPress y plugins, y cambios chicos.

---

## 9. Registro de decisiones

| # | Fecha | Decisión | Motivo |
| :- | :- | :- | :- |
| D1 | 08/10/2026 | Proyecto nuevo desde cero (no se usa el prototipo Volta) | — |
| D2 | 08/10/2026 | WordPress + WooCommerce en lugar de Tiendanube | Sin comisión de plataforma; tienda completa dentro del presupuesto; plugins para fase 2 |
| D3 | 08/10/2026 | WooCommerce en lugar de desarrollo a medida completo | Con USD [monto] el desarrollo a medida solo alcanzaba una versión sin carrito |
| D4 | 08/10/2026 | Panel simple en Next.js sobre la API de WooCommerce | wp-admin tiene una curva de aprendizaje alta para el cliente |
| D5 | 08/10/2026 | Panel desplegado en Netlify | El plan gratuito de Vercel no permite uso comercial |
| D6 | 08/10/2026 | Compra como invitado, sin cuentas de cliente | Compra poco frecuente; registrarse hace perder ventas |
| D7 | 08/10/2026 | Compatibilidad como taxonomía propia con `show_in_rest` | Que el panel pueda gestionarla por API |

**Plugins aprobados:** WooCommerce, Mercado Pago (oficial), SMTP, backups. Cualquier otro se agrega acá con su motivo.

---

## 10. Pendientes para el cliente

| # | Pregunta | Qué bloquea |
| :- | :- | :- |
| P1 | ¿Hacen canje de la batería usada? ¿Con qué diferencia de precio? | Modelo de producto (simple o variable) |
| P2 | ¿Colocan la batería en el local? ¿A domicilio? ¿Está incluida en el precio? | Servicios y tarifas de envío en MdP |
| P3 | ¿Quién carga el catálogo inicial (productos, precios, stock, fotos)? ¿Tienen lista del proveedor? | Capítulo 2 y plazo |
| P4 | ¿El proveedor les pasa una tabla de compatibilidad por vehículo? | Buscador por vehículo |
| P5 | ¿Emiten factura electrónica? ¿Monotributo o responsable inscripto? | Facturación y textos legales |
| P6 | Razón social, CUIT, dirección, horarios | Páginas legales y contacto |
| P7 | Nombre comercial, logo y dominio deseado | Identidad y T1.1 |
| P8 | Zonas y tarifa de envío en Mar del Plata | T3.1 |
| P9 | Datos bancarios y descuento por transferencia | T3.3 |
| P10 | Envío nacional: ¿con qué transporte despacharían baterías? | Fase 2 |

### Pendientes del desarrollador

| # | Tema |
| :- | :- |
| PD1 | Alcance escrito y forma de pago (50% / 50%), y monto de la mensualidad |
| PD2 | Cuánto del panel entra en los USD [monto] (mínimo: pedidos + precio y stock); el resto, como extra o fase 2 |
| PD3 | Elegir hosting de WordPress |

---

## Anexo A — Variables de entorno del panel (Netlify)

| Variable | Uso |
| :- | :- |
| `WC_URL` | URL de la tienda |
| `WC_CONSUMER_KEY` / `WC_CONSUMER_SECRET` | API REST de WooCommerce (permisos de lectura y escritura) |
| `WP_APP_USER` / `WP_APP_PASSWORD` | Contraseña de aplicación de WordPress para subir imágenes y gestionar la taxonomía |
| `AUTH_SECRET` | Firma de sesiones de Auth.js |
| `ADMIN_USER` / `ADMIN_PASSWORD_HASH` | Credenciales del panel (contraseña guardada como hash) |

Ninguna lleva el prefijo `NEXT_PUBLIC_`: todas son solo de servidor.
