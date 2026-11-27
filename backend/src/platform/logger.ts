import { pino, type DestinationStream, type Logger } from 'pino';

/** Campos que nunca pueden quedar en un log (constitución VI, FR-059). */
const CAMPOS_PERSONALES = [
  'dni',
  'direccion',
  'calle',
  'telefono',
  'email',
  'nombre',
  'referencias',
];

/** pino admite un comodín por nivel: se generan rutas hasta 4 niveles de profundidad. */
function rutasOcultas(): string[] {
  const rutas: string[] = [];
  for (const campo of CAMPOS_PERSONALES) {
    rutas.push(campo, `*.${campo}`, `*.*.${campo}`, `*.*.*.${campo}`);
  }
  rutas.push('req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]');
  return rutas;
}

export function crearLogger(opciones: { nivel: string; destino?: DestinationStream }): Logger {
  const config = {
    level: opciones.nivel,
    redact: { paths: rutasOcultas(), censor: '[oculto]' },
  };
  return opciones.destino ? pino(config, opciones.destino) : pino(config);
}

export type { Logger };
