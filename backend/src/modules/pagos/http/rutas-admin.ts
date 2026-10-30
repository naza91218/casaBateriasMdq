import { Alerta, FiltroAlertas } from '@casa/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { usuarioActual } from '../../../http/plugins/sesion.js';
import type { ServicioAlertas } from '../application/alertas.js';

/** Alertas de pago en el panel (FR-031). Se registran bajo /admin, que ya exige sesión. */
export function rutasAdminAlertas(deps: { alertas: ServicioAlertas }): FastifyPluginAsyncZod {
  return async (app) => {
    const tags = ['panel-pedidos'];

    app.get('/alertas', { schema: { tags, querystring: FiltroAlertas, response: { 200: z.array(Alerta) } } }, (req) =>
      deps.alertas.listar({ soloAbiertas: req.query.estado === 'abiertas' }),
    );

    app.post(
      '/alertas/:id/resolver',
      { schema: { tags, params: z.object({ id: z.string().uuid('Alerta inválida') }), response: { 200: Alerta } } },
      (req) => deps.alertas.resolver(req.params.id, usuarioActual(req).id),
    );
  };
}
