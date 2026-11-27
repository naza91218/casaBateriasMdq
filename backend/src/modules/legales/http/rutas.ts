import { RespuestaArrepentimiento, SolicitudArrepentimiento } from '@casa/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { ServicioArrepentimientos } from '../application/arrepentimientos.js';

/** Botón de arrepentimiento del pie de la tienda (FR-058). */
export function rutasLegales(deps: {
  arrepentimientos: ServicioArrepentimientos;
}): FastifyPluginAsyncZod {
  return async (app) => {
    app.post(
      '/arrepentimiento',
      {
        config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
        schema: {
          tags: ['legales'],
          body: SolicitudArrepentimiento,
          response: { 201: RespuestaArrepentimiento },
        },
      },
      async (req, reply) => reply.code(201).send(await deps.arrepentimientos.registrar(req.body)),
    );
  };
}
