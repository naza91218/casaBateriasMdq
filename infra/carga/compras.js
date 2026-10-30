// Ráfaga de compras sobre el mismo producto (T150): muchas personas confirman a la vez y hay
// menos stock que compradores. Meta: 0 errores 500, ninguna sobreventa y p95 < 500 ms.
//
// Variables: PRODUCTO (id de un producto activo con stock conocido) y COMPRAS (cuántas a la vez).
// Las compras exitosas responden 201 y las que llegan sin stock, 409: las dos están bien.
// Después de correrlo, verificar-sobreventa.sql confirma que no se vendió de más.
import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

const API = __ENV.API ?? 'http://localhost:4000/api/v1';
const PRODUCTO = __ENV.PRODUCTO;
const COMPRAS = Number(__ENV.COMPRAS ?? 50);

const creadas = new Counter('compras_creadas');
const sinStock = new Counter('compras_sin_stock');

export const options = {
  scenarios: {
    rafaga: { executor: 'per-vu-iterations', vus: COMPRAS, iterations: 1, maxDuration: '1m' },
  },
  thresholds: {
    // Ningún error del servidor: 201 o 409 son respuestas correctas.
    'http_req_duration{expected_response:true}': ['p(95)<500'],
    checks: ['rate==1'],
  },
};

export function setup() {
  if (!PRODUCTO) throw new Error('Falta PRODUCTO: el id de un producto activo con stock');
}

export default function () {
  const r = http.post(
    `${API}/pedidos`,
    JSON.stringify({
      items: [{ productoId: PRODUCTO, cantidad: 1 }],
      entrega: 'retiro',
      medioPago: 'transferencia',
      comprador: {
        nombre: `Prueba Carga ${__VU}`,
        dni: String(30000000 + __VU),
        telefono: '223 512 3456',
        email: `carga-${__VU}@prueba.test`,
      },
    }),
    {
      headers: {
        'content-type': 'application/json',
        // Cada comprador con su IP: si no, el límite de 10 compras por minuto frena la ráfaga.
        'x-forwarded-for': `10.8.${Math.floor(__VU / 250)}.${(__VU % 250) + 1}`,
      },
      responseCallback: http.expectedStatuses(201, 409),
    },
  );
  if (r.status === 201) creadas.add(1);
  if (r.status === 409) sinStock.add(1);
  check(r, { 'creada o sin stock, nunca un error': (x) => x.status === 201 || x.status === 409 });
}
