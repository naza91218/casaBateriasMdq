import {
  ConsultaSeguimiento,
  Cotizacion,
  PedidoCreado,
  Seguimiento,
  SolicitudCotizacion,
  SolicitudPedido,
} from '@casa/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { ServicioPedidos } from '../application/crear-pedido.js';
import type { ServicioSeguimiento } from '../application/seguimiento.js';

export function rutasPedidos(deps: {
  pedidos: ServicioPedidos;
  seguimiento: ServicioSeguimiento;
}): FastifyPluginAsyncZod {
  return async (app) => {
    const tags = ['compra'];
    const idPedido = z.object({ id: z.string().uuid('Pedido inválido') });

    app.post(
      '/checkout/cotizar',
      {
        config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
        schema: { tags, body: SolicitudCotizacion, response: { 200: Cotizacion } },
      },
      (req) => deps.pedidos.cotizar(req.body),
    );

    app.post(
      '/pedidos',
      {
        config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
        schema: { tags, body: SolicitudPedido, response: { 201: PedidoCreado } },
      },
      async (req, reply) => reply.code(201).send(await deps.pedidos.crear(req.body)),
    );

    app.get(
      '/pedidos/:id',
      { schema: { tags, params: idPedido, querystring: ConsultaSeguimiento, response: { 200: Seguimiento } } },
      (req) => deps.seguimiento.obtener(req.params.id, req.query.t, req.query.retorno),
    );

    app.post(
      '/pedidos/:id/reintentar-pago',
      {
        config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
        schema: {
          tags,
          params: idPedido,
          querystring: z.object({ t: z.string().min(1) }),
          response: { 200: z.object({ initPoint: z.string().nullable() }) },
        },
      },
      (req) => deps.seguimiento.reintentarPago(req.params.id, req.query.t),
    );
  };
}
