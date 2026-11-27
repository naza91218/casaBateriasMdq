// Ráfaga de avisos de Mercado Pago (T150).
//  - Siempre: avisos con firma inválida, como los de alguien que prueba falsificarlos. Tienen que
//    rechazarse rápido (401) sin consultar a Mercado Pago.
//  - Con PAGO y SECRETO: el mismo aviso válido muchas veces a la vez, como cuando Mercado Pago
//    reintenta. Todos 200 y el pedido cambia una sola vez (ver verificar-sobreventa.sql).
// Meta: p95 < 500 ms y ningún 500.
import http from 'k6/http';
import { check } from 'k6';
import crypto from 'k6/crypto';

const API = __ENV.API ?? 'http://localhost:4000/api/v1';
const PAGO = __ENV.PAGO; // id de un pago aprobado en el sandbox, de un pedido de staging
const SECRETO = __ENV.SECRETO; // MP_WEBHOOK_SECRET de staging

export const options = {
  scenarios: {
    falsificados: {
      executor: 'constant-arrival-rate',
      exec: 'falsificado',
      rate: 50,
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 50,
    },
    ...(PAGO && SECRETO
      ? {
          repetidos: {
            executor: 'per-vu-iterations',
            exec: 'repetido',
            vus: 20,
            iterations: 5,
            startTime: '35s',
          },
        }
      : {}),
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],
    checks: ['rate==1'],
  },
};

function aviso(idPago, firma, requestId) {
  return http.post(
    `${API}/webhooks/mercadopago?data.id=${idPago}&type=payment`,
    JSON.stringify({ type: 'payment', data: { id: idPago } }),
    {
      headers: {
        'content-type': 'application/json',
        'x-request-id': requestId,
        'x-signature': firma,
      },
      responseCallback: http.expectedStatuses(200, 401),
    },
  );
}

export function falsificado() {
  const r = aviso(String(100000 + __ITER), 'ts=1730000000,v1=deadbeef', `falso-${__VU}-${__ITER}`);
  check(r, { 'firma inválida → 401': (x) => x.status === 401 });
}

export function repetido() {
  const requestId = `repetido-${__VU}-${__ITER}`;
  const ts = String(Math.floor(Date.now() / 1000));
  const v1 = crypto.hmac('sha256', SECRETO, `id:${PAGO};request-id:${requestId};ts:${ts};`, 'hex');
  const r = aviso(PAGO, `ts=${ts},v1=${v1}`, requestId);
  check(r, { 'aviso repetido → 200': (x) => x.status === 200 });
}
