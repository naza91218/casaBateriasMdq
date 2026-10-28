# Feature Specification: Tienda online de La Casa de las Baterías

**Feature Branch**: `001-tienda-online`

**Created**: 2026-10-28

**Status**: Draft

**Input**: User description: "Tienda online completa de La Casa de las Baterías (Mar del Plata, 45 años): una sola spec para todo el sistema, organizada en historias de usuario priorizadas. Fuentes: docs/specs-previas/001…009, PRODUCT.md, DISENO_UI.md, DESIGN.md, PLAN_TECNICO.md y la constitución."

> Spec única del sistema. Reemplaza a `docs/specs-previas/001…009`; cada requisito indica entre
> paréntesis el ID anterior para mantener la trazabilidad. La identidad visual y las pantallas
> aprobadas por el cliente están en `DESIGN.md`, `DISENO_UI.md` y el prototipo.

**Actores**

- **Comprador:** automovilista de Mar del Plata, muchas veces mayor y con poca práctica en
  internet, que compra desde el celular y no sabe qué medida de batería lleva su auto.
- **Administrador:** la persona a cargo de la tienda (hoy Juan, nieto del dueño). Gestiona
  pedidos, precios, stock y fotos, y sale a colocar las baterías.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Encontrar la batería para mi auto (Priority: P1)

El comprador elige marca, modelo y año de su auto y ve solo las baterías que le sirven, separadas
en económica y reforzada, con precio, servicio incluido y una explicación simple de la diferencia.
También puede recorrer el catálogo completo con filtros y abrir la ficha de cada batería. Si su
auto no aparece o no hay stock, tiene un botón a WhatsApp con el auto ya escrito.

**Why this priority**: es el corazón de la tienda y su diferencial ("el auto lleva a la batería").
Sin esto no hay forma de vender a quien no sabe medidas.

**Independent Test**: con productos y autos de ejemplo cargados, buscar un auto, ver solo las
baterías compatibles, filtrar el catálogo y abrir una ficha. Entrega valor aunque la compra se
cierre por WhatsApp.

**Acceptance Scenarios**:

1. **Given** un Gol Trend 2008–2023 compatible con 12x65 y dos baterías 12x65 (Sermat económica y
   Herbo reforzada), **When** el comprador elige Volkswagen → Gol Trend → 2015, **Then** ve las dos
   baterías, la económica primero.
2. **Given** el mismo auto, **When** el comprador despliega los años, **Then** el 2005 (fuera de
   rango) no figura.
3. **Given** un modelo sin compatibilidad cargada, **When** el comprador lo busca, **Then** ve
   "Todavía no tenemos cargado tu auto" y un botón de WhatsApp con marca, modelo y año en el
   mensaje.
4. **Given** todas las baterías 12x65 sin stock, **When** se busca un Gol Trend, **Then** ve "Sin
   stock para tu auto" y el botón de WhatsApp.
5. **Given** un comprador que buscó un Corsa 2009, **When** vuelve a la portada, **Then** el
   buscador ya muestra Corsa 2009 seleccionado.
6. **Given** 10 productos de 3 marcas, **When** el comprador filtra por "Sermat" y "reforzada",
   **Then** ve solo productos Sermat reforzados y, al compartir el enlace, otra persona ve el mismo
   filtro.
7. **Given** un producto con stock 0, **When** el comprador abre la ficha, **Then** ve "Sin stock",
   no puede comprarlo y tiene un botón a WhatsApp con el nombre del producto.
8. **Given** un producto pausado, **When** alguien entra a su dirección, **Then** ve la página de
   "no encontrado" y el producto no figura en listados.
9. **Given** un descuento por transferencia del 10 %, **When** el comprador ve una ficha de
   $100.000, **Then** ve "$100.000" y "$90.000 por transferencia".
10. **Given** un celular de 375 px de ancho, **When** se usa el buscador, **Then** los tres
    selectores y el botón se ven sin desplazamiento horizontal y cada área táctil mide 48 px o más.

---

### User Story 2 - Comprar como invitado y pagar (Priority: P1)

El comprador agrega baterías al carrito y completa una sola página: sus datos (con una línea que
explica para qué se usa cada uno), si quiere colocación a domicilio o retiro en el local, y cómo
paga: Mercado Pago, transferencia con descuento o efectivo al retirar. Al confirmar, la tienda
reserva el stock, le muestra el número de pedido y un enlace privado para seguirlo. Si paga por
transferencia, ve los datos bancarios, el monto exacto y el plazo de 48 h. Un pedido impago a las
48 h se cancela solo y el stock vuelve.

**Why this priority**: sin cobro no hay negocio. Junto con la historia 1 forma el producto mínimo
que vende.

**Independent Test**: comprar una batería con cada medio de pago (Mercado Pago en modo de prueba)
y con cada forma de entrega; verificar stock, estado y enlace de seguimiento. La confirmación de
la transferencia puede hacerse directamente sobre los datos mientras no exista el panel.

**Acceptance Scenarios**:

1. **Given** un carrito con una batería, **When** el comprador elige colocación sin cargar
   dirección, **Then** no puede confirmar y ve "Falta la dirección para ir a colocarla".
2. **Given** un DNI con letras, **When** se intenta confirmar, **Then** ve "El DNI tiene solo
   números, sin puntos".
3. **Given** stock 1 de un producto, **When** dos compradores confirman a la vez, **Then** uno crea
   el pedido y el otro ve "Se agotó mientras comprabas"; el stock queda en 0, nunca en negativo.
4. **Given** un pedido enviado con un precio alterado desde el navegador, **When** se crea,
   **Then** el total es el calculado por la tienda con los precios vigentes.
5. **Given** colocación a domicilio elegida, **When** el comprador ve los medios de pago, **Then**
   "Efectivo al retirar" no aparece.
6. **Given** descuento del 10 % y un pedido de $100.000, **When** elige transferencia, **Then** el
   total pasa a $90.000 y los datos bancarios muestran $90.000 y el plazo de 48 h.
7. **Given** un pago aprobado por Mercado Pago, **When** la tienda recibe el aviso y lo verifica con
   Mercado Pago, **Then** el pedido pasa a pagado y el pago queda registrado.
8. **Given** el comprador vuelve de Mercado Pago con un "aprobado" en la dirección pero sin aviso
   verificado, **When** se abre la página de retorno, **Then** el pedido sigue pendiente y la página
   dice "Estamos confirmando tu pago".
9. **Given** el mismo aviso de pago recibido tres veces, **When** se procesa, **Then** el pedido
   cambia una sola vez y se envía un solo mail.
10. **Given** un aviso de pago con firma inválida, **When** llega, **Then** se rechaza y no cambia
    nada.
11. **Given** un pago aprobado por un monto menor al del pedido, **When** se procesa, **Then** el
    pedido no se marca pagado y queda una alerta para el administrador.
12. **Given** un pago rechazado, **When** el comprador vuelve, **Then** ve "El pago no se aprobó" y
    un botón para reintentar.
13. **Given** un pedido creado, **When** el comprador abre su enlace de seguimiento, **Then** ve
    número, productos, entrega, estado y, si corresponde, los datos bancarios, pero no su DNI.
14. **Given** el enlace de seguimiento con un código incorrecto, **When** se abre, **Then** ve la
    página de "no encontrado".
15. **Given** una zona "Batán" con costo extra de $5.000, **When** se elige colocación en Batán,
    **Then** el total suma $5.000 y se muestra desglosado.
16. **Given** un pedido pendiente de pago creado hace 49 h, **When** corre el control de
    vencimientos, **Then** queda cancelado, el stock vuelve y el comprador recibe el aviso; uno de
    hace 47 h sigue pendiente.
17. **Given** un pedido cancelado, **When** se intenta cancelar de nuevo, **Then** el stock no
    vuelve a sumarse.

---

### User Story 3 - Gestionar pedidos desde el panel (Priority: P2)

El administrador entra al panel con un enlace que le llega al mail, sin contraseña, desde la
compu o el celular. Ve primero los pedidos nuevos, abre el detalle con los datos del comprador
(incluido el DNI), abre la dirección en el mapa o le escribe por WhatsApp. Cuando ve la
transferencia acreditada en la cuenta del banco, la confirma con un toque; cuando el cliente
retira y paga en efectivo, lo registra. Después mueve el pedido a "en camino", "listo para
retirar", "entregado" o "cancelado".

**Why this priority**: la transferencia solo puede confirmarla una persona, así que sin el panel
esos pedidos no avanzan. Va después de la compra porque al principio se puede operar con ayuda
técnica.

**Independent Test**: con pedidos de prueba en distintos estados, ingresar al panel desde un
celular, confirmar una transferencia, registrar un efectivo y recorrer los estados de un pedido.

**Acceptance Scenarios**:

1. **Given** alguien sin sesión, **When** abre cualquier pantalla del panel, **Then** es llevado al
   ingreso.
2. **Given** un mail no autorizado, **When** pide el enlace de ingreso, **Then** no se envía nada y
   la pantalla muestra lo mismo que con un mail válido.
3. **Given** un pedido por transferencia pendiente, **When** el administrador toca "Confirmar
   transferencia" y acepta la confirmación, **Then** el pedido pasa a pagado, queda registrado quién
   y cuándo lo confirmó, y el comprador recibe el mail.
4. **Given** un pedido "a pagar en el local", **When** el administrador registra el pago en
   efectivo al entregar, **Then** el pedido pasa a entregado con el pago registrado.
5. **Given** un pedido con colocación, **When** el administrador toca "Abrir en el mapa", **Then**
   se abre el mapa con la dirección del comprador.
6. **Given** un pedido entregado, **When** el administrador abre el menú de estados, **Then** no
   aparecen estados anteriores.
7. **Given** un pedido entregado, **When** se intenta pasarlo a pendiente de pago por cualquier
   medio, **Then** se rechaza y queda registrado el intento.
8. **Given** el administrador con la guía de uso, **When** gestiona un pedido completo sin ayuda,
   **Then** lo logra en menos de 10 minutos.

---

### User Story 4 - Avisos por mail en cada paso (Priority: P2)

El comprador recibe un mail cuando hace el pedido, cuando se confirma el pago, cuando va en
camino o está listo para retirar, cuando se entrega y si se cancela. El administrador recibe un
aviso por cada pedido nuevo y cada pago confirmado, con un enlace directo al pedido en el panel.

**Why this priority**: evita llamadas de "¿en qué está mi pedido?" y que el administrador se pierda
un pedido nuevo. La tienda vende sin esto, pero con más fricción.

**Independent Test**: recorrer un pedido de punta a punta y verificar que cada cambio de estado
genera exactamente un mail al destinatario correcto, con el contenido esperado.

**Acceptance Scenarios**:

1. **Given** un pedido con transferencia, **When** se crea, **Then** el comprador recibe el mail
   con CBU/alias, monto y plazo, y el administrador recibe el aviso con enlace al panel.
2. **Given** un pedido pagado, **When** el administrador lo marca "en camino", **Then** el
   comprador recibe "Vamos en camino" con el número de pedido.
3. **Given** cualquier mail al comprador, **When** se revisa su contenido, **Then** no contiene el
   DNI.
4. **Given** el servicio de mails caído, **When** se crea un pedido, **Then** el pedido se crea
   igual, el error queda registrado y el mail sale al reintentar.
5. **Given** un evento "pagado" procesado dos veces, **When** se envían los mails, **Then** sale uno
   solo.
6. **Given** un mail enviado a una casilla de Gmail, **When** se analiza con una herramienta de
   reputación de mails, **Then** obtiene 9/10 o más y no cae en spam.

---

### User Story 5 - Mantener el catálogo y la configuración (Priority: P2)

El administrador busca un producto y cambia precio o stock desde el listado, pausa o activa
productos y sube, ordena y borra fotos desde el celular. Carga el catálogo completo y la tabla de
autos compatibles desde una planilla, y edita el descuento por transferencia, los datos
bancarios, los horarios, el WhatsApp y las zonas de colocación.

**Why this priority**: los precios cambian seguido. La carga inicial puede hacerse por planilla,
pero el mantenimiento diario tiene que ser autónomo.

**Independent Test**: importar una planilla de productos y otra de compatibilidades, editar un
precio y una foto desde el celular y verificar el cambio en la tienda pública.

**Acceptance Scenarios**:

1. **Given** una planilla con 20 filas, 2 con medida inválida, **When** el administrador la
   importa, **Then** se cargan 18 y el informe indica la fila y el motivo de las otras 2.
2. **Given** un código de producto que ya existe, **When** se importa con otro precio, **Then** se
   actualiza el precio y el producto no se duplica.
3. **Given** un producto a $100.000, **When** el administrador cambia el precio a $110.000 desde
   el listado, **Then** la ficha pública muestra $110.000 en menos de 1 minuto.
4. **Given** un producto activo, **When** el administrador lo pausa, **Then** deja de verse en la
   tienda y no puede comprarse.
5. **Given** una planilla de compatibilidades (marca, modelo, años, medida), **When** se importa,
   **Then** los autos aparecen en el buscador con su medida.
6. **Given** el descuento por transferencia en 10 %, **When** el administrador lo cambia a 12 %,
   **Then** las fichas y el checkout muestran el nuevo precio por transferencia.

---

### User Story 6 - Confianza, presencia en Google y medición (Priority: P3)

La portada muestra en el primer pantallazo del celular el buscador y el servicio incluido. Hay
páginas de "Quiénes somos" (historia, 45 años, equipo, local) y "Contacto" (mapa, horarios, formas
de pago, WhatsApp). Cada batería y cada modelo de auto tiene su propia página, preparada para
aparecer en Google ("batería para Gol Trend en Mar del Plata"). Las ventas quedan medidas para
saber qué publicidad funciona, sin enviar datos personales.

**Why this priority**: suma clientes nuevos y confianza, pero la tienda puede vender sin esto
desde el primer día.

**Independent Test**: revisar en un celular la portada y las páginas institucionales; validar una
ficha en la herramienta de resultados enriquecidos de Google; hacer una compra de prueba y ver el
evento de compra en la herramienta de analítica.

**Acceptance Scenarios**:

1. **Given** la portada en un celular de 375 × 667, **When** carga, **Then** el buscador y el
   servicio incluido se ven sin desplazarse.
2. **Given** la página del Gol Trend, **When** se lee sin ejecutar scripts, **Then** contiene el
   título, las baterías y los precios.
3. **Given** una ficha de producto, **When** se valida en la prueba de resultados enriquecidos de
   Google, **Then** los datos de producto son válidos y sin errores.
4. **Given** un producto pausado, **When** se genera el mapa del sitio, **Then** no aparece.
5. **Given** una compra con Mercado Pago aprobada, **When** se revisa la analítica en vivo,
   **Then** aparece la compra con el total y sin datos personales.
6. **Given** una visita que llega desde una campaña de Instagram, **When** compra dos páginas
   después, **Then** la venta se atribuye a Instagram.

---

### User Story 7 - Legales y cuidado de los datos personales (Priority: P3)

La tienda cumple la Ley de Defensa del Consumidor y la Ley 25.326: términos, privacidad, cambios
y garantía, datos del comercio y botón de arrepentimiento en el pie de todas las páginas. El DNI
se guarda protegido y solo lo ve el administrador en el panel. El administrador puede anonimizar
los datos de un pedido cuando el comprador lo pide.

**Why this priority**: no cambia cómo se compra, pero es obligatorio antes de salir a producción.

**Independent Test**: revisar el pie en cualquier página, enviar una solicitud de arrepentimiento,
anonimizar un pedido y verificar que el DNI no aparece en ningún lugar fuera del panel.

**Acceptance Scenarios**:

1. **Given** cualquier página de la tienda, **When** se mira el pie, **Then** están los enlaces
   legales, los datos del comercio y el botón de arrepentimiento.
2. **Given** un comprador con un pedido, **When** completa el formulario de arrepentimiento,
   **Then** recibe un código, el administrador recibe el aviso y el pedido muestra la solicitud.
3. **Given** un pedido guardado, **When** se consultan los datos almacenados directamente, **Then**
   el DNI no está legible.
4. **Given** un error forzado en el checkout, **When** se revisan los registros de errores,
   **Then** no aparecen el DNI ni la dirección.
5. **Given** la dirección de la tienda con `http://`, **When** se abre, **Then** redirige a la
   versión segura `https://`.
6. **Given** un pedido entregado, **When** el administrador lo anonimiza, **Then** nombre, DNI,
   teléfono, mail y dirección se reemplazan, y el total, los productos y la fecha se conservan.

---

### User Story 8 - Operación confiable (Priority: P3, transversal)

La tienda está siempre en línea en el servidor del cliente, la información no se pierde y los
problemas se detectan antes de que los note un cliente: copia diaria de los datos, aviso si la
tienda se cae o falla, y ninguna versión con errores llega a producción.

**Why this priority**: no es una función que el comprador vea, pero sostiene a todas las demás.
Las tareas de base (servidor, copias, publicación segura) se hacen al principio aunque la
historia figure como P3.

**Independent Test**: restaurar la copia del día anterior en un entorno de prueba, forzar una
caída y un error y verificar los avisos, e intentar publicar una versión con un test fallido.

**Acceptance Scenarios**:

1. **Given** la copia de ayer, **When** se restaura en un entorno de prueba, **Then** la tienda de
   prueba funciona con esos datos.
2. **Given** un test que falla, **When** se intenta publicar, **Then** la publicación se frena y la
   tienda sigue con la versión anterior.
3. **Given** la tienda caída, **When** pasan 5 minutos, **Then** llega un aviso por mail.
4. **Given** el acta de entrega, **When** el cliente la revisa, **Then** todas las cuentas y el
   servidor figuran a su nombre, con sus accesos.

---

### Edge Cases

- **Última unidad disputada:** dos compras simultáneas de la última batería; solo una se crea
  (US2, escenario 3).
- **Stock que cambia durante el checkout:** el administrador baja el stock o pausa un producto
  mientras alguien compra; al confirmar se informa qué producto ya no está disponible.
- **Precio que cambia durante el checkout:** el pedido se crea con el precio vigente al confirmar
  y el comprador lo ve antes de pagar.
- **Pago de Mercado Pago que llega después del vencimiento:** si se aprueba un pago de un pedido
  ya cancelado por las 48 h, el pedido no se reactiva solo: queda una alerta para el administrador
  para reponer stock o devolver el dinero.
- **Transferencia que llega tarde:** el comprador transfiere después de la cancelación; el
  administrador ve el pedido cancelado y decide desde el panel (no hay reactivación automática).
- **Avisos de pago duplicados, desordenados o falsos:** se procesan una sola vez, en orden de
  estado válido, y los que no tienen firma válida se descartan.
- **Monto distinto:** pago aprobado por un monto distinto al total; no se marca pagado y se alerta.
- **Auto con varias medidas:** un vehículo compatible con más de una medida muestra todas las
  baterías de esas medidas.
- **Auto cargado sin productos activos de su medida:** se trata como "sin stock" y ofrece
  WhatsApp.
- **Mail del comprador mal escrito:** el pedido se crea igual; el enlace de seguimiento se muestra
  en la pantalla final y el administrador tiene el teléfono para contactarlo.
- **Servicio de mails caído:** la operación sigue y los mails se reintentan (US4, escenario 4).
- **Producto sin foto:** se muestra un marcador neutro, nunca una imagen rota.
- **Enlace de ingreso al panel vencido o ya usado:** se pide uno nuevo con un mensaje claro.
- **Arrepentimiento sobre un pedido ya colocado:** se registra la solicitud y el administrador la
  gestiona fuera del sistema (retiro de la batería).

## Requirements *(mandatory)*

### Functional Requirements

#### Catálogo

- **FR-001**: Cada producto MUST tener código único (SKU), marca, medida, amperaje, arranque en
  frío (CCA), gama (económica o reforzada), precio de lista, stock, estado activo o pausado y al
  menos una foto (R-CAT-01).
- **FR-002**: Las marcas MUST administrarse como lista cerrada, inicialmente Sermat, Herbo, Volta
  y Edna (R-CAT-02).
- **FR-003**: Las medidas MUST incluir inicialmente 12x65, 12x75, 12x90, 12x110 y 12x160
  (R-CAT-03).
- **FR-004**: Cada producto MUST poder tener un precio con entrega de la batería usada, y el
  comprador MUST poder elegir en la ficha si entrega la usada o no (R-CAT-04).
- **FR-005**: El catálogo MUST filtrar por marca, medida y gama de forma combinable, y los filtros
  MUST quedar en la dirección de la página para poder compartirlos (R-CAT-05).
- **FR-006**: La ficha MUST mostrar fotos, especificaciones, precio de lista, precio por
  transferencia, autos compatibles y el servicio incluido: colocación, medición del alternador y
  12 meses de garantía (R-CAT-06).
- **FR-007**: La tienda MUST explicar la diferencia entre económica y reforzada en el listado y en
  la ficha (R-CAT-07).
- **FR-008**: Un producto pausado MUST NOT verse ni comprarse; uno sin stock MUST mostrar "Sin
  stock" y el botón de WhatsApp, sin opción de compra (R-CAT-08).

#### Buscador por auto

- **FR-009**: Cada vehículo MUST tener marca, modelo, año desde, año hasta y motor opcional, y
  estar asociado a una o más medidas (R-BUS-01, R-BUS-02).
- **FR-010**: El buscador MUST pedir marca → modelo → año, en ese orden, mostrando en cada paso
  solo opciones con datos (R-BUS-03).
- **FR-011**: El resultado MUST mostrar todos los productos activos con stock de las medidas
  compatibles, agrupados por gama, la económica primero (R-BUS-04).
- **FR-012**: Si el auto no está cargado o no hay stock de su medida, MUST ofrecerse WhatsApp con
  el mensaje "Hola, busco batería para un {marca} {modelo} {año}" (R-BUS-05).
- **FR-013**: El buscador MUST estar en la portada, en el catálogo y accesible desde el encabezado
  de cada página en el celular (R-BUS-06).
- **FR-014**: La tienda MUST recordar en el dispositivo el último auto elegido (R-BUS-08).

#### Carrito, checkout y entrega

- **FR-015**: El comprador MUST poder comprar sin crear cuenta, en una sola página, con validación
  en el momento y mensajes que digan cómo corregir cada error (R-PED-01, R-PED-04).
- **FR-016**: El checkout MUST pedir nombre y apellido, DNI, teléfono y mail, y, si hay
  colocación, dirección (calle, número, zona) y referencias, explicando para qué se usa cada dato
  y enlazando la política de privacidad (R-PED-01, R-ENT-03, R-LEG-04).
- **FR-017**: Las formas de entrega MUST ser colocación a domicilio (con zona) y retiro en el
  local; las zonas MUST ser configurables con costo extra opcional, 0 por defecto (R-ENT-01,
  R-ENT-02).
- **FR-018**: El carrito MUST admitir más de una batería y conservarse en el dispositivo si el
  comprador sale y vuelve (R-PED-06).
- **FR-019**: Todos los importes (subtotal, canje, descuento, costo de zona, total) MUST
  calcularse en la tienda con los precios vigentes; lo que envía el navegador MUST limitarse a
  productos, cantidades y opciones (R-PED-03).
- **FR-020**: Al confirmar, la tienda MUST crear el pedido y descontar el stock en una sola
  operación indivisible; si algún producto no alcanza, MUST NOT crearse nada y MUST informarse qué
  producto falta (R-PED-02).
- **FR-021**: Cada pedido MUST tener un número correlativo legible (por ejemplo #1048) y un enlace
  privado de seguimiento, imposible de adivinar, que muestre estado, productos, entrega y, si
  corresponde, datos bancarios, sin mostrar el DNI (R-PED-05).

#### Pagos

- **FR-022**: Los medios de pago MUST ser Mercado Pago, transferencia con descuento y efectivo al
  retirar; el efectivo MUST ofrecerse solo con retiro en el local (R-PAG-01).
- **FR-023**: El precio publicado MUST ser el de lista; la transferencia MUST aplicar el
  porcentaje de descuento configurado (R-PAG-02).
- **FR-024**: Un pedido con Mercado Pago MUST pasar a pagado solo cuando la tienda verifica con
  Mercado Pago que el pago está aprobado y el monto coincide; el regreso del comprador desde
  Mercado Pago MUST NOT cambiar el estado (R-PAG-03, R-PAG-04).
- **FR-025**: Los avisos de pago de Mercado Pago MUST validarse como auténticos y procesarse una
  sola vez aunque lleguen repetidos (R-PAG-05).
- **FR-026**: Un pago rechazado MUST dejar el pedido pendiente y permitir reintentar desde el
  enlace de seguimiento (R-PAG-06).
- **FR-027**: Con transferencia, el pedido MUST quedar pendiente de pago y mostrar CBU/alias,
  titular, monto exacto y plazo de 48 h en la pantalla final, en el seguimiento y en el mail
  (R-PAG-07).
- **FR-028**: Una transferencia MUST marcarse como pagada solo cuando el administrador la
  verifica en la cuenta bancaria y la confirma desde el panel; ningún otro medio (comprobante,
  aviso del comprador) MUST cambiar ese estado (constitución, principio V).
- **FR-029**: Con efectivo, el pedido MUST quedar "a pagar en el local" y el administrador MUST
  registrar el cobro al entregar (R-PAG-08).
- **FR-030**: Cada intento de pago y cada confirmación manual MUST registrarse con medio, monto,
  estado, fecha y, si es manual, quién la hizo (R-PAG-09).
- **FR-031**: Un pago aprobado por un monto distinto, o sobre un pedido ya cancelado, MUST NOT
  cambiar el pedido a pagado y MUST generar una alerta visible para el administrador.

#### Estados del pedido

- **FR-032**: Los estados MUST ser: pendiente de pago, a pagar en el local, pagado, en camino,
  listo para retirar, entregado y cancelado, con estas transiciones y ninguna otra (R-PED-07):
  pendiente de pago → pagado o cancelado; a pagar en el local → entregado o cancelado; pagado →
  en camino (colocación) o listo para retirar (retiro) o cancelado; en camino → entregado; listo
  para retirar → entregado.
- **FR-033**: Todo cambio de estado MUST registrar estado anterior, nuevo, quién lo hizo y cuándo,
  y todo intento de transición inválida MUST rechazarse y quedar registrado (R-PED-08).
- **FR-034**: Un pedido pendiente de pago o a pagar en el local sin pago a las 48 h MUST
  cancelarse automáticamente y devolver su stock; el control MUST correr al menos cada hora
  (R-PED-09, R-OPS-01).
- **FR-035**: Cancelar un pedido MUST devolver su stock una sola vez, aunque la cancelación se
  intente varias veces (R-PED-10).

#### Avisos por mail

- **FR-036**: El comprador MUST recibir un mail por pedido recibido, pago confirmado, en camino o
  listo para retirar, entregado y cancelado (R-NOT-01).
- **FR-037**: El administrador MUST recibir un aviso por cada pedido nuevo, cada pago confirmado,
  cada alerta de pago y cada solicitud de arrepentimiento, con enlace al pedido en el panel
  (R-NOT-02, R-LEG-03).
- **FR-038**: Todos los mails al comprador MUST incluir número de pedido, productos, entrega,
  total, enlace de seguimiento y botón de WhatsApp, y el de transferencia los datos bancarios,
  monto y plazo; MUST NOT incluir el DNI (R-NOT-03, R-NOT-04, R-NOT-05).
- **FR-039**: Los mails MUST salir desde el dominio del negocio, configurado para no caer en spam
  (R-NOT-06).
- **FR-040**: Un mail que falla MUST NOT frenar la operación: el error se registra y el envío se
  reintenta; cada mail MUST enviarse una sola vez por evento (R-NOT-07, R-NOT-08).

#### Panel del administrador

- **FR-041**: El panel MUST exigir ingreso con un enlace enviado a un mail autorizado, sin
  contraseña; la sesión MUST durar 30 días en el mismo dispositivo y poder cerrarse; al pedir el
  enlace, la respuesta MUST ser la misma para mails autorizados y no autorizados (R-PAN-01,
  R-PAN-02).
- **FR-042**: El panel MUST admitir más de un usuario a futuro, aunque al inicio haya uno solo
  (R-PAN-03).
- **FR-043**: La lista de pedidos MUST mostrar primero los nuevos y filtrar por estado; el detalle
  MUST mostrar productos, total, medio de pago, entrega, alertas y datos del comprador incluido el
  DNI, con accesos a abrir la dirección en el mapa y a escribir por WhatsApp (R-PAN-04, R-PAN-05).
- **FR-044**: El administrador MUST poder confirmar una transferencia o registrar un cobro en
  efectivo con un toque y una confirmación, y mover el pedido solo entre transiciones válidas;
  cada cambio MUST disparar su mail (R-PAN-06, R-PAN-07).
- **FR-045**: El administrador MUST poder buscar productos y editar precio y stock desde el
  listado, pausar o activar productos y subir, ordenar y borrar fotos desde el celular (R-PAN-08,
  R-PAN-09).
- **FR-046**: El administrador MUST poder importar productos y compatibilidades desde una
  planilla: cada fila se valida, se crea o actualiza por código, y se devuelve un informe de filas
  con error sin cortar la carga (R-CAT-09, R-BUS-09).
- **FR-047**: El administrador MUST poder editar el porcentaje de descuento, los datos bancarios,
  los horarios, el WhatsApp y las zonas de colocación (R-PAN-10).
- **FR-048**: El administrador SHOULD poder asignar o quitar autos compatibles a una medida desde
  el panel; si no entra en el plazo, alcanza con la importación por planilla (R-PAN-11).
- **FR-049**: Todo el panel MUST poder usarse en un celular de 375 px sin hacer zoom (R-PAN-12).

#### Contenido, Google y medición

- **FR-050**: La portada MUST mostrar en el primer pantallazo del celular el buscador y el
  servicio incluido (R-SEO-01).
- **FR-051**: MUST existir "Quiénes somos" (historia, 45 años, equipo, local) y "Contacto" (mapa,
  dirección, horarios, formas de pago, WhatsApp) (R-SEO-02, R-SEO-03).
- **FR-052**: Un botón flotante de WhatsApp MUST estar en todas las páginas de la tienda, excepto
  el checkout (R-SEO-04).
- **FR-053**: Cada producto y cada modelo de auto con compatibilidad MUST tener una página propia,
  con dirección legible y estable, título y descripción únicos, y contenido legible por buscadores
  sin ejecutar scripts (R-SEO-05, R-SEO-08, R-BUS-07).
- **FR-054**: Las fichas MUST incluir datos estructurados de producto (precio, disponibilidad,
  marca) y la portada los del comercio local (dirección, horarios) (R-SEO-06).
- **FR-055**: La tienda MUST publicar un mapa del sitio con productos activos y modelos con
  compatibilidad, y excluir de los buscadores el panel, el checkout y el seguimiento de pedidos
  (R-SEO-07).
- **FR-056**: La tienda MUST medir ver producto, agregar al carrito, iniciar compra y compra (esta
  última solo con pago confirmado) en Google Analytics y Meta, sin enviar datos personales, y
  conservar el origen de campaña hasta la compra (R-SEO-11, R-SEO-12, R-SEO-13).

#### Legales y datos personales

- **FR-057**: El pie de todas las páginas MUST enlazar términos y condiciones, política de
  privacidad, política de cambios y garantía, datos del comercio (razón social, CUIT, domicilio) y
  el botón de arrepentimiento (R-LEG-01).
- **FR-058**: El botón de arrepentimiento MUST llevar a un formulario (número de pedido, nombre,
  mail) que genere un código de seguimiento, avise al administrador y quede registrado en el
  pedido (R-LEG-02, R-LEG-03).
- **FR-059**: El DNI MUST guardarse cifrado y mostrarse solo en el panel; DNI, dirección y
  teléfono MUST NOT aparecer en direcciones de página, registros, mensajes de error, analítica ni
  mails al comprador (R-LEG-05, R-LEG-06).
- **FR-060**: Toda la tienda MUST servirse por conexión segura (HTTPS), redirigiendo los accesos
  no seguros (R-LEG-07).
- **FR-061**: El administrador MUST poder anonimizar los datos personales de un pedido
  conservando productos, totales y fecha (R-LEG-08).

#### Operación

- **FR-062**: Los datos MUST copiarse todos los días fuera del servidor de la tienda y
  conservarse 30 días; MUST existir un procedimiento de restauración escrito y probado antes de la
  salida (R-OPS-02, R-OPS-03).
- **FR-063**: Los errores de la tienda MUST reportarse automáticamente al desarrollador, y un
  monitor externo MUST revisar la tienda cada 5 minutos y avisar por mail si no responde
  (R-OPS-04, R-OPS-05).
- **FR-064**: Una versión nueva MUST publicarse solo si pasan todos los controles y tests; si
  algo falla, la tienda MUST seguir con la versión anterior (R-OPS-06).
- **FR-065**: MUST existir un entorno de prueba separado de producción, con credenciales de pago
  de prueba y datos que no sean los reales (R-OPS-07, R-OPS-08).
- **FR-066**: Todas las cuentas y el servidor MUST estar a nombre del negocio, con el
  desarrollador como colaborador, y documentados en un acta de entrega junto con una guía de
  soporte (tienda caída, pago no acreditado, mail no recibido, stock desfasado) (R-OPS-09,
  R-OPS-10).

#### Experiencia y accesibilidad

- **FR-067**: Cada pantalla MUST funcionar primero en un celular de 375 px: texto de 17 px como
  mínimo, áreas táctiles de 48 px o más y contraste WCAG AA (constitución, principio I).
- **FR-068**: Ninguna pantalla MUST dejar al comprador sin salida: ante auto no encontrado, falta
  de stock o error, MUST ofrecer WhatsApp con el contexto precargado (constitución, principio
  III).
- **FR-069**: Los textos MUST usar voseo rioplatense, frases cortas y sin tecnicismos, y la
  identidad MUST seguir el diseño aprobado (`DESIGN.md`).

### Key Entities *(include if feature involves data)*

- **Producto:** una batería a la venta. Código, marca, medida, amperaje, CCA, gama, precio de
  lista, precio con canje, stock, activo/pausado, fotos ordenadas.
- **Marca:** lista cerrada de fabricantes (Sermat, Herbo, Volta, Edna).
- **Medida:** formato de batería (12x65…); es el puente entre autos y productos.
- **Vehículo:** marca, modelo, rango de años y motor opcional; se asocia a una o más medidas.
- **Pedido:** número correlativo, código privado de seguimiento, estado, forma de entrega, zona,
  medio de pago, subtotal, canje, descuento, costo de zona, total, vencimiento, fecha.
- **Ítem del pedido:** producto, cantidad, precio unitario al momento de la compra y si entrega
  la usada.
- **Datos del comprador:** nombre, DNI (protegido), teléfono, mail, dirección y referencias;
  anonimizables.
- **Pago:** medio, identificador externo, estado, monto, fecha y, si es manual, quién lo
  confirmó.
- **Evento del pedido:** historial de estados (de, a, quién, cuándo) e intentos rechazados.
- **Alerta:** situación que requiere decisión del administrador (monto distinto, pago sobre
  pedido cancelado).
- **Zona de colocación:** nombre, costo extra, activa.
- **Solicitud de arrepentimiento:** pedido, nombre, mail, código, fecha.
- **Configuración:** porcentaje de descuento por transferencia, datos bancarios, horarios,
  WhatsApp, horas de vencimiento.
- **Usuario del panel:** mail autorizado y, a futuro, rol.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un comprador encuentra las baterías de su auto en 3 pasos y menos de 30 segundos
  desde la portada en el celular.
- **SC-002**: Un comprador completa el checkout en menos de 2 minutos en el celular.
- **SC-003**: Cero ventas sin stock: ninguna prueba de compras simultáneas deja stock negativo ni
  dos pedidos por la misma última unidad.
- **SC-004**: El 100 % de los pedidos marcados como pagados tiene un pago verificado con Mercado
  Pago o una confirmación manual registrada con quién y cuándo.
- **SC-005**: El 100 % de los pedidos impagos se cancela entre las 48 y las 49 h, con el stock
  devuelto.
- **SC-006**: El administrador gestiona un pedido completo y edita un producto sin ayuda en menos
  de 10 minutos, desde el celular.
- **SC-007**: Cada cambio de estado genera exactamente un mail al comprador, y los mails obtienen
  9/10 o más en una prueba de reputación.
- **SC-008**: La portada, la ficha y la página de un auto cargan en menos de 3 segundos en un
  celular con 4G y obtienen 90 o más en las auditorías de rendimiento, accesibilidad y SEO de
  Google.
- **SC-009**: Cada criterio de aceptación de esta spec tiene una prueba automática o manual
  documentada, y la compra completa se prueba de punta a punta antes de cada salida.
- **SC-010**: Una copia de los datos de las últimas 24 h puede restaurarse y la tienda vuelve a
  funcionar en menos de 2 horas.
- **SC-011**: Una caída de la tienda se avisa en 5 minutos o menos.
- **SC-012**: El DNI no aparece en ningún lugar fuera del panel (mails, registros, analítica,
  direcciones de página).

## Assumptions

- **Alcance:** lo prometido en la propuesta aceptada (USD [monto], 30 días corridos). Quedan fuera:
  cuentas de cliente, turnos de colocación, cupones, envíos fuera de Mar del Plata, reseñas,
  comparador, blog, recordatorios automáticos, WhatsApp automático, reportes de ventas, roles con
  permisos distintos, facturación electrónica y las funciones de "Preparada para crecer".
- **Canje de la usada:** se asume que existe (el prototipo aprobado lo incluye) con un precio con
  canje por producto. Si el cliente decide que no, se oculta la opción sin cambiar el resto
  (pregunta P1).
- **Zonas:** se asume una zona por defecto ("Mar del Plata") sin costo extra; las demás las carga
  el administrador (P8).
- **Descuento por transferencia:** configurable; valor inicial 10 % hasta que el cliente lo
  confirme (P9). No aplica al efectivo salvo que el cliente lo pida.
- **Plazo de 48 h:** se aplica también a "pagar en el local".
- **Motor:** el buscador ignora el motor salvo que el vehículo lo tenga cargado; si un modelo
  necesita medidas distintas por motor, se cargan como vehículos separados.
- **Compatibilidades:** la tabla auto → medida sale de catálogos de proveedores y fabricantes; la
  carga inicial la hace el desarrollador por planilla (P4).
- **Contenido:** textos, fotos del local y del equipo, horarios, razón social y CUIT los entrega
  el cliente; mientras tanto se usan marcadores sin inventar datos (P5, P6).
- **Textos legales:** se usan modelos estándar; conviene que los revise un profesional. La
  inscripción de la base ante la AAIP corre por cuenta del negocio.
- **Hosting:** la tienda corre en un VPS de HostGator contratado y pagado por el cliente; el
  resto de los servicios de terceros se mantiene en planes gratuitos (constitución).
- **Mercado Pago:** la cuenta es del negocio y se crea antes de la semana 2; los reembolsos se
  hacen desde Mercado Pago, no desde la tienda.
- **Tipografía:** la licencia web de Sport Headline está sin confirmar; si no se consigue, se usa
  una alternativa con el mismo carácter definida en el plan.
- **Usuarios:** un único administrador al inicio, con mail a definir (Q-PAN-01).
