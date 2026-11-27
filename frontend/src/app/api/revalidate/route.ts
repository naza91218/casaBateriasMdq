import { revalidateTag } from 'next/cache';
import { timingSafeEqual } from 'node:crypto';

/**
 * El backend avisa qué etiquetas regenerar cuando cambian precios, stock, autos o configuración
 * (RevalidadorFrontend). Contrato: POST { etiquetas: string[] } con x-revalidate-secret.
 */
export async function POST(req: Request) {
  const secreto = process.env.REVALIDATE_SECRET;
  const recibido = req.headers.get('x-revalidate-secret') ?? '';
  if (!secreto || !iguales(recibido, secreto)) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  const cuerpo = (await req.json().catch(() => null)) as { etiquetas?: unknown } | null;
  const etiquetas = Array.isArray(cuerpo?.etiquetas)
    ? cuerpo.etiquetas.filter((e): e is string => typeof e === 'string' && e.length <= 256)
    : [];
  if (!etiquetas.length) return Response.json({ error: 'Faltan etiquetas' }, { status: 400 });

  // Sin contenido viejo: un precio o un stock desactualizado no se muestra ni una vez más.
  for (const e of etiquetas) revalidateTag(e, { expire: 0 });
  return Response.json({ revalidadas: etiquetas });
}

function iguales(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
