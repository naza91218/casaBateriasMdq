/** Dirección pública de la tienda: mapa del sitio, robots, llms.txt y datos estructurados. */
export const SITIO = (process.env.NEXT_PUBLIC_SITIO_URL ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
);

export const NOMBRE = 'La Casa de las Baterías';
