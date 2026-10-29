import { SolicitudConsultaCanje, Whatsapp } from '@casa/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { ServicioCanje } from '../application/consultas.js';

export function rutasCanje(deps: { canje: ServicioCanje }): FastifyPluginAsyncZod {
  return async (app) => {
    app.post(
      '/consultas-canje',
      {
        config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
        schema: {
          tags: ['canje'],
          body: SolicitudConsultaCanje,
          response: { 201: z.object({ whatsapp: Whatsapp }) },
        },
      },
      async (req, reply) => reply.code(201).send(await deps.canje.registrar(req.body)),
    );
  };
}
