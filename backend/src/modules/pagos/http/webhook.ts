import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { ServicioPagosMercadoPago } from '../application/procesar-pago.js';

/**
 * POST /webhooks/mercadopago (contracts/webhook-mercadopago.md).
 * 401 con firma inválida; 200 cuando terminó; 500 si no se pudo consultar el pago (MP reintenta).
 */
export function rutasWebhookMercadoPago(deps: { pagos: ServicioPagosMercadoPago }): FastifyPluginAsyncZod {
  return async (app) => {
    app.post(
      '/webhooks/mercadopago',
      {
        schema: {
          tags: ['pagos'],
          querystring: z.object({ 'data.id': z.string().optional(), type: z.string().optional() }).loose(),
          body: z
            .object({ type: z.string().optional(), data: z.object({ id: z.coerce.string() }).optional() })
            .loose()
            .optional(),
          response: { 200: z.object({ resultado: z.string() }) },
        },
      },
      async (req) => {
        const idPago = req.query['data.id'] ?? req.body?.data?.id ?? '';
        const resultado = await deps.pagos.procesar({
          tipo: req.query.type ?? req.body?.type ?? '',
          idPago,
          requestId: String(req.headers['x-request-id'] ?? ''),
          firma: String(req.headers['x-signature'] ?? ''),
        });
        return { resultado };
      },
    );
  };
}
