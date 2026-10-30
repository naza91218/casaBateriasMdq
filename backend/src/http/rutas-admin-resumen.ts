import { ResumenAdmin } from '@casa/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { ServicioAlertas } from '../modules/pagos/application/alertas.js';
import type { ServicioPanelPedidos } from '../modules/pedidos/application/consultas-panel.js';

/**
 * Inicio del panel: lo que espera al administrador (FR-043). Junta contadores de varios
 * módulos; los de productos a revisar y consultas de canje se suman en US5.
 */
export function rutasAdminResumen(deps: {
  panel: ServicioPanelPedidos;
  alertas: ServicioAlertas;
}): FastifyPluginAsyncZod {
  return async (app) => {
    app.get('/resumen', { schema: { tags: ['panel'], response: { 200: ResumenAdmin } } }, async () => {
      const [pedidos, alertasAbiertas] = await Promise.all([deps.panel.contadores(), deps.alertas.contarAbiertas()]);
      return { ...pedidos, alertasAbiertas };
    });
  };
}
