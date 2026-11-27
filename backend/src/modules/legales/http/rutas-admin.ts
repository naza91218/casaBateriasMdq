import { ArrepentimientoAdmin } from '@casa/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { ServicioArrepentimientos } from '../application/arrepentimientos.js';

/** Solicitudes de arrepentimiento en el panel (FR-058). Bajo /admin, que ya exige sesión. */
export function rutasAdminLegales(deps: {
  arrepentimientos: ServicioArrepentimientos;
}): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/arrepentimientos',
      { schema: { tags: ['panel-legales'], response: { 200: z.array(ArrepentimientoAdmin) } } },
      () => deps.arrepentimientos.listar(),
    );
  };
}
