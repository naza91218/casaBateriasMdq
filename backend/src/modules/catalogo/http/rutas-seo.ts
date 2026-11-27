import { IndiceSeo } from '@casa/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { ServicioIndiceSeo } from '../application/indice-seo.js';

/** Índice para el mapa del sitio y `llms.txt` (FR-055, FR-074). */
export function rutasSeo(deps: { indice: ServicioIndiceSeo }): FastifyPluginAsyncZod {
  return async (app) => {
    app.get('/seo/indice', { schema: { tags: ['seo'], response: { 200: IndiceSeo } } }, () =>
      deps.indice.obtener(),
    );
  };
}
