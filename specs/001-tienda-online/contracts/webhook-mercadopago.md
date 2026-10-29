# Contrato: webhook de Mercado Pago

**Ruta:** `POST /api/v1/webhooks/mercadopago` · Requisitos: FR-024, FR-025, FR-031, FR-034b.

## Entrada

Notificación de Mercado Pago (tipo `payment`):

- Query: `data.id` (id del pago), `type=payment`.
- Headers: `x-signature: ts=<epoch>,v1=<hmac>` y `x-request-id`.
- Body JSON con `action`, `data.id`, `type`.

## Proceso

1. **Firma.** Armar el manifiesto `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`, calcular
   HMAC-SHA256 con `MP_WEBHOOK_SECRET` y comparar en tiempo constante con `v1`. Si no coincide →
   **401** y no se hace nada (US2-10).
2. **Tipos ignorados.** Si `type` no es `payment` → **200** sin procesar.
3. **Consulta.** `GET https://api.mercadopago.com/v1/payments/{data.id}` con `MP_ACCESS_TOKEN`.
   Nunca se usa el estado que trae la notificación ni el `back_url` del navegador (US2-08).
4. **Pedido.** `external_reference` → `pedidos.id`. Si no existe → 200 y registro de advertencia.
5. **Idempotencia.** Insertar en `pagos` con `UNIQUE (medio, id_externo)`; si ya existe con el
   mismo estado → 200 sin efectos (US2-09). Si cambió el estado, se actualiza.
6. **Decisión** (dentro de la transacción de `cambiarEstado`):

| Estado del pago | Pedido | Resultado |
| :- | :- | :- |
| `approved`, monto = total | `pendiente_pago` | → `pagado`, mails "pago confirmado" y aviso al admin |
| `approved`, monto ≠ total | cualquiera | sin cambio de estado; alerta `monto_distinto` (US2-11) |
| `approved` | `cancelado` | sin reactivar; alerta `pago_sobre_cancelado` |
| `approved` | ya `pagado` o posterior | sin efectos |
| `rejected`, `cancelled` | `pendiente_pago` | sin cambio; se registra el intento (US2-12) |
| `pending`, `in_process` | `pendiente_pago` | sin cambio (no debería ocurrir con medios instantáneos) |

7. **Respuesta.** **200** en cuanto el procesamiento termina (Mercado Pago reintenta si no recibe
   2xx). Errores de red al consultar el pago → **500** para que Mercado Pago reintente.

## Preferencia (al crear el pedido o reintentar)

- `external_reference`: id del pedido.
- `items`: uno por ítem con `unit_price` en pesos (centavos / 100), `quantity`.
- `notification_url`: `{API_PUBLIC_URL}/api/v1/webhooks/mercadopago`.
- `back_urls`: `{FRONTEND_URL}/pedido/{id}?t={token}` para success, failure y pending;
  `auto_return: approved`.
- `expires: true`, `expiration_date_to`: `pedido.vence_en` (30 min).
- `payment_methods.excluded_payment_types`: `[{ id: "ticket" }, { id: "atm" }]`.
- `statement_descriptor`: "CASA BATERIAS".
- Sin datos personales del comprador salvo el mail (lo pide Mercado Pago para el comprobante).

## Pruebas

- Firmas válidas e inválidas generadas en el test con un secreto fijo.
- Cliente de Mercado Pago reemplazado por un adaptador falso (`PasarelaPago`) que devuelve cada
  estado de la tabla.
- En staging: sandbox con usuarios de prueba.
