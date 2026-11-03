import type { ConfiguracionPublica, ErrorRespuesta, OpcionVehiculo } from '@casa/shared';

/**
 * Cliente de la API. Desde el servidor de Next va por la red interna (API_INTERNAL_URL);
 * desde el navegador va a /api/v1 en el mismo dominio (Nginx, o el rewrite en desarrollo).
 */
const BASE =
  typeof window === 'undefined'
    ? `${process.env.API_INTERNAL_URL ?? 'http://localhost:4000'}/api/v1`
    : '/api/v1';

export class ErrorApi extends Error {
  constructor(
    readonly estado: number,
    mensaje: string,
    /** Código del cuerpo de error de la API (VALIDACION, SIN_STOCK, PEDIDOS_SIN_PAGAR…). */
    readonly codigo?: string,
    /** Mensaje por campo, con la ruta del dato ("comprador.dni"). */
    readonly campos: Record<string, string> = {},
  ) {
    super(mensaje);
  }
}

async function comoError(r: Response, ruta: string): Promise<ErrorApi> {
  const cuerpo = (await r.json().catch(() => null)) as Partial<ErrorRespuesta> | null;
  const e = cuerpo?.error;
  return new ErrorApi(
    r.status,
    e?.mensaje ?? `La API respondió ${r.status} en ${ruta}`,
    e?.codigo,
    e?.campos,
  );
}

type Opciones = {
  etiquetas?: string[];
  segundos?: number;
  senal?: AbortSignal;
  /** Datos de una persona (seguimiento de un pedido): nunca van a la caché de Next. */
  sinCache?: boolean;
};

export async function pedir<T>(ruta: string, o: Opciones = {}): Promise<T> {
  const r = await fetch(`${BASE}${ruta}`, {
    headers: { accept: 'application/json' },
    signal: o.senal,
    // Las etiquetas son las que usa el backend al pedir la revalidación (POST /api/revalidate).
    ...(typeof window === 'undefined'
      ? o.sinCache
        ? { cache: 'no-store' as const }
        : { next: { revalidate: o.segundos ?? 300, tags: o.etiquetas ?? [] } }
      : {}),
  });
  if (!r.ok) throw await comoError(r, ruta);
  return (await r.json()) as T;
}

/** POST a la API desde el navegador (cotizar, crear el pedido, reintentar el pago). */
export async function enviar<T>(ruta: string, cuerpo?: unknown, senal?: AbortSignal): Promise<T> {
  const r = await fetch(`${BASE}${ruta}`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      ...(cuerpo ? { 'content-type': 'application/json' } : {}),
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    signal: senal,
  });
  if (!r.ok) throw await comoError(r, ruta);
  return (await r.json()) as T;
}

/** Para la portada: si la API no responde, la página igual se muestra con lo que haya. */
export async function intentar<T>(promesa: Promise<T>): Promise<T | null> {
  try {
    return await promesa;
  } catch {
    return null;
  }
}

export const api = {
  configuracion: () =>
    pedir<ConfiguracionPublica>('/configuracion/publica', { etiquetas: ['configuracion'] }),
  marcas: () => pedir<OpcionVehiculo[]>('/vehiculos/marcas', { etiquetas: ['buscador'] }),
  modelos: (marca: string, senal?: AbortSignal) =>
    pedir<OpcionVehiculo[]>(`/vehiculos/modelos?marca=${encodeURIComponent(marca)}`, { senal }),
  anios: (marca: string, modelo: string, senal?: AbortSignal) =>
    pedir<number[]>(
      `/vehiculos/anios?marca=${encodeURIComponent(marca)}&modelo=${encodeURIComponent(modelo)}`,
      { senal },
    ),
};

/** Enlace de WhatsApp con un mensaje armado, para que nadie quede sin salida. */
export function enlaceWhatsapp(numero: string | undefined, mensaje: string): string {
  const n = (numero ?? '').replace(/\D/g, '');
  const texto = encodeURIComponent(mensaje);
  return n ? `https://wa.me/${n}?text=${texto}` : `https://wa.me/?text=${texto}`;
}
