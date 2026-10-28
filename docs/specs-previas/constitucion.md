# Constitución del proyecto

Principios que ninguna spec, tarea o atajo puede romper. Cambiar uno requiere una decisión anotada en [PLAN_TECNICO.md](../../PLAN_TECNICO.md) §9.

## Producto

1. **El cliente compra en pocos pasos, sin cuenta.** Pensado para alguien grande que usa poco internet: letra clara, botones grandes, un dato por campo y la explicación de por qué se pide.
2. **El diferencial es el servicio.** Colocación incluida, medición del alternador y 12 meses de garantía se ven en la portada, en cada ficha y en el checkout.
3. **Nunca un callejón sin salida.** Si un auto no aparece, si no hay stock o si algo falla, el cliente tiene un botón a WhatsApp con el contexto precargado.
4. **Lo prometido en la propuesta es alcance; lo que no está, no.** Las funciones de "Preparada para crecer" (turnos, beneficio para clientes, ARCA, reportes) quedan fuera hasta que se coticen.

## Datos y dinero

5. **No se vende lo que no hay.** El stock se descuenta de forma atómica al crear el pedido y se devuelve al cancelarlo.
6. **Un pedido está pagado solo cuando el pago está confirmado:** Mercado Pago lo aprueba (consultado a su API) o Juan confirma la transferencia o el efectivo.
7. **Los importes se calculan en el servidor**, en centavos enteros. El navegador nunca envía precios.
8. **Los datos personales son del comprador.** DNI cifrado, solo visible en el panel, nunca en URLs, logs, analytics ni mails al comprador.

## Ingeniería

9. **Monolito modular.** Cada módulo (catálogo, compatibilidad, pedidos, pagos, clientes, entregas, notificaciones, configuración) expone servicios; nadie toca las tablas de otro.
10. **Los cambios de estado pasan por una sola función** que valida la transición y registra el evento.
11. **Cada criterio de aceptación tiene un test.** La compra completa se prueba de punta a punta antes de cada salida a producción.
12. **Sin costo fijo de infraestructura** mientras entre en los planes gratuitos; todo a nombre del negocio.
13. **Celular primero.** Cada pantalla se diseña y prueba primero a 375 px de ancho.
