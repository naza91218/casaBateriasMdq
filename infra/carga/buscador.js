// Prueba de carga del buscador (T150): 100 personas buscando batería a la vez, cada una con el
// recorrido completo marca → modelo → año → resultados, como en la portada.
// Meta: p95 < 500 ms y 0 errores.
import http from 'k6/http';
import { check, sleep } from 'k6';

const API = __ENV.API ?? 'http://localhost:4000/api/v1';

export const options = {
  scenarios: {
    buscador: {
      executor: 'ramping-vus',
      stages: [
        { duration: '30s', target: 100 },
        { duration: __ENV.DURACION ?? '2m', target: 100 },
        { duration: '15s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate==0'],
    http_req_duration: ['p(95)<500'],
  },
};

/** Una sola vez: los autos cargados, para buscar lo que existe de verdad. */
export function setup() {
  const autos = [];
  const marcas = http.get(`${API}/vehiculos/marcas`).json();
  for (const marca of marcas.slice(0, 15)) {
    const modelos = http.get(`${API}/vehiculos/modelos?marca=${marca.slug}`).json();
    for (const modelo of modelos.slice(0, 5))
      autos.push({ marca: marca.slug, modelo: modelo.slug });
  }
  if (autos.length === 0) throw new Error('No hay autos cargados: importá las compatibilidades');
  return { autos };
}

export default function ({ autos }) {
  const { marca, modelo } = autos[Math.floor(Math.random() * autos.length)];
  // Cada IP simulada es una persona distinta (solo cuenta si k6 corre en la red del servidor).
  const params = { headers: { 'x-forwarded-for': `10.9.${__VU % 250}.${(__ITER % 250) + 1}` } };

  check(http.get(`${API}/vehiculos/marcas`, params), { marcas: (r) => r.status === 200 });
  sleep(1);
  check(http.get(`${API}/vehiculos/modelos?marca=${marca}`, params), {
    modelos: (r) => r.status === 200,
  });
  sleep(1);
  const anios = http.get(`${API}/vehiculos/anios?marca=${marca}&modelo=${modelo}`, params);
  check(anios, { anios: (r) => r.status === 200 });
  const lista = anios.json();
  const anio = lista.length ? `&anio=${lista[Math.floor(Math.random() * lista.length)]}` : '';
  sleep(1);
  check(http.get(`${API}/vehiculos/compatibles?marca=${marca}&modelo=${modelo}${anio}`, params), {
    resultados: (r) => r.status === 200,
  });
  // La página del modelo es la que recorren Google y los buscadores con IA.
  check(http.get(`${API}/vehiculos/${marca}/${modelo}`, params), {
    pagina: (r) => r.status === 200,
  });
  sleep(2);
}
