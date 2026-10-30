import { ResumenAdmin } from '@casa/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { ServicioAdminCanje } from '../modules/canje/application/admin-consultas.js';
import type { ServicioAdminProductos } from '../modules/catalogo/application/admin-productos.js';
import type { ServicioAlertas } from '../modules/pagos/application/alertas.js';
import type { ServicioPanelPedidos } from '../modules/pedidos/application/consultas-panel.js';

/** Inicio del panel: lo que espera al administrador (FR-043, FR-070). Junta contadores de varios módulos. */
export function rutasAdminResumen(deps: {
  panel: ServicioPanelPedidos;
  alertas: ServicioAlertas;
  productos: ServicioAdminProductos;
  canje: ServicioAdminCanje;
}): FastifyPluginAsyncZod {
  return async (app) => {
    app.get('/resumen', { schema: { tags: ['panel'], response: { 200: ResumenAdmin } } }, async () => {
      const [pedidos, alertasAbiertas, productosARevisar, consultasCanjePendientes] = await Promise.all([
        deps.panel.contadores(),
        deps.alertas.contarAbiertas(),
        deps.productos.contarARevisar(),
        deps.canje.contarPendientes(),
      ]);
      return { ...pedidos, alertasAbiertas, productosARevisar, consultasCanjePendientes };
    });
  };
}
