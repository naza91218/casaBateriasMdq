import type { Revalidador } from '../shared-kernel/puertos.js';

/** Avisa al frontend (Next.js) qué etiquetas regenerar. Contrato en contracts/api-rest.md. */
export class RevalidadorFrontend implements Revalidador {
  constructor(
    private readonly urlFrontend: string,
    private readonly secreto: string,
  ) {}

  async revalidar(etiquetas: string[]): Promise<void> {
    if (etiquetas.length === 0) return;
    const respuesta = await fetch(new URL('/api/revalidate', this.urlFrontend), {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-revalidate-secret': this.secreto },
      body: JSON.stringify({ etiquetas }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!respuesta.ok) throw new Error(`Revalidación respondió ${respuesta.status}`);
  }
}

/** Mientras no exista el frontend (fase 11), la revalidación no hace nada. */
export const revalidadorNulo: Revalidador = { revalidar: async () => {} };
