import { ConsultaCanjeAdmin, EdicionConsultaCanje, FiltroConsultasCanje } from '@casa/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { ServicioAdminCanje } from '../application/admin-consultas.js';

/** Consultas de canje en el panel (FR-004b). Bajo /admin, que ya exige sesión. */
export function rutasAdminCanje(deps: { canje: ServicioAdminCanje }): FastifyPluginAsyncZod {
  return async (app) => {
    const tags = ['panel-canje'];

    // Con formato=csv devuelve la planilla para abrir en Excel.
    app.get(
      '/consultas-canje',
      { schema: { tags, querystring: FiltroConsultasCanje, response: { 200: z.union([z.array(ConsultaCanjeAdmin), z.string()]) } } },
      async (req, reply) => {
        if (req.query.formato === 'csv') {
          return reply
            .header('content-type', 'text/csv; charset=utf-8')
            .header('content-disposition', 'attachment; filename="consultas-canje.csv"')
            .send(await deps.canje.planilla(req.query.estado));
        }
        return deps.canje.listar({ estado: req.query.estado });
      },
    );

    app.patch(
      '/consultas-canje/:id',
      {
        schema: {
          tags,
          params: z.object({ id: z.string().uuid('Consulta inválida') }),
          body: EdicionConsultaCanje,
          response: { 200: ConsultaCanjeAdmin },
        },
      },
      (req) => deps.canje.cambiarEstado(req.params.id, req.body.estado),
    );
  };
}
