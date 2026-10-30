import { CambioEstadoAdmin, FiltroPedidosAdmin, ListaPedidosAdmin, PedidoDetalleAdmin } from '@casa/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { usuarioActual } from '../../../http/plugins/sesion.js';
import type { ServicioAnonimizacion } from '../../clientes/application/anonimizar.js';
import type { ServicioPagosManuales } from '../../pagos/application/pagos-manuales.js';
import type { ServicioPanelPedidos } from '../application/consultas-panel.js';

/**
 * Pedidos en el panel (US3). Se registran bajo /admin, que ya exige sesión. Las acciones
 * devuelven el detalle actualizado para que la pantalla no tenga que volver a pedirlo.
 */
export function rutasAdminPedidos(deps: {
  panel: ServicioPanelPedidos;
  pagosManuales: ServicioPagosManuales;
  anonimizacion: ServicioAnonimizacion;
}): FastifyPluginAsyncZod {
  return async (app) => {
    const tags = ['panel-pedidos'];
    const params = z.object({ id: z.string().uuid('Pedido inválido') });
    const accion = { tags, params, response: { 200: PedidoDetalleAdmin } };

    app.get('/pedidos', { schema: { tags, querystring: FiltroPedidosAdmin, response: { 200: ListaPedidosAdmin } } }, (req) =>
      deps.panel.listar(req.query),
    );

    app.get('/pedidos/:id', { schema: accion }, (req) => deps.panel.detalle(req.params.id));

    app.post('/pedidos/:id/confirmar-transferencia', { schema: accion }, async (req) => {
      await deps.pagosManuales.confirmarTransferencia(req.params.id, usuarioActual(req).id);
      return deps.panel.detalle(req.params.id);
    });

    app.post('/pedidos/:id/registrar-efectivo', { schema: accion }, async (req) => {
      await deps.pagosManuales.registrarEfectivo(req.params.id, usuarioActual(req).id);
      return deps.panel.detalle(req.params.id);
    });

    app.post('/pedidos/:id/estado', { schema: { ...accion, body: CambioEstadoAdmin } }, async (req) => {
      await deps.panel.moverEstado(req.params.id, req.body, usuarioActual(req).id);
      return deps.panel.detalle(req.params.id);
    });

    // Cuando el comprador pide que se borren sus datos (FR-061).
    app.post('/pedidos/:id/anonimizar', { schema: accion }, async (req) => {
      await deps.anonimizacion.anonimizar(req.params.id);
      return deps.panel.detalle(req.params.id);
    });
  };
}
