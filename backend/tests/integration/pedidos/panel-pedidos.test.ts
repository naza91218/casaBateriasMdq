import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { productos } from '../../../src/modules/catalogo/infrastructure/schema.js';
import { outboxMensajes } from '../../../src/modules/notificaciones/infrastructure/schema.js';
import { pagos } from '../../../src/modules/pagos/infrastructure/schema.js';
import { pedidoEventos, pedidos } from '../../../src/modules/pedidos/infrastructure/schema.js';
import { DIA } from '../../../src/shared-kernel/reloj.js';
import { prepararCompra, solicitud, stockDe, type EscenarioCompra } from '../../setup/compra.js';
import { idDeAdmin } from '../../setup/sesion.js';

let e: EscenarioCompra;
let admin: string;

beforeAll(async () => {
  e = await prepararCompra();
  await e.ctx.db.update(productos).set({ stock: 100 }).where(eq(productos.id, e.productoId));
  admin = await idDeAdmin(e.ctx);
});

afterAll(async () => {
  await e.ctx.cerrar();
});

const transferencia = () => e.ctx.servicios.pedidos.crear(solicitud(e));
const efectivo = () => e.ctx.servicios.pedidos.crear(solicitud(e, { medioPago: 'efectivo' }));

async function estado(id: string) {
  const [p] = await e.ctx.db
    .select({ estado: pedidos.estado })
    .from(pedidos)
    .where(eq(pedidos.id, id));
  return p?.estado;
}

async function mails(pedidoId: string, evento: string) {
  return e.ctx.db
    .select()
    .from(outboxMensajes)
    .where(and(eq(outboxMensajes.pedidoId, pedidoId), eq(outboxMensajes.evento, evento)));
}

describe('pagos manuales (FR-028, FR-029)', () => {
  test('US3-03: confirmar transferencia → pagado, pago manual con quién y cuándo, mail al comprador', async () => {
    const { id, total } = await transferencia();
    await e.ctx.servicios.pagosManuales.confirmarTransferencia(id, admin);

    expect(await estado(id)).toBe('pagado');
    const [pago] = await e.ctx.db.select().from(pagos).where(eq(pagos.pedidoId, id));
    expect(pago).toMatchObject({
      medio: 'transferencia',
      estado: 'confirmado_manual',
      confirmadoPor: admin,
      monto: BigInt(total),
    });
    expect(pago?.creadoEn).toBeInstanceOf(Date);
    const [evento] = await e.ctx.db
      .select()
      .from(pedidoEventos)
      .where(and(eq(pedidoEventos.pedidoId, id), eq(pedidoEventos.a, 'pagado')));
    expect(evento?.actor).toBe(admin);
    expect(await mails(id, 'pago_confirmado')).toHaveLength(1);
  });

  test('confirmar dos veces (doble toque) → la segunda es 409 y hay un solo pago', async () => {
    const { id } = await transferencia();
    await e.ctx.servicios.pagosManuales.confirmarTransferencia(id, admin);
    await expect(
      e.ctx.servicios.pagosManuales.confirmarTransferencia(id, admin),
    ).rejects.toMatchObject({
      tipo: 'conflicto',
    });
    expect(await e.ctx.db.select().from(pagos).where(eq(pagos.pedidoId, id))).toHaveLength(1);
  });

  test('confirmar transferencia sobre un pedido en efectivo → 422', async () => {
    const { id } = await efectivo();
    await expect(
      e.ctx.servicios.pagosManuales.confirmarTransferencia(id, admin),
    ).rejects.toMatchObject({
      codigo: 'MEDIO_DISTINTO',
    });
    expect(await estado(id)).toBe('a_pagar_en_local');
  });

  test('US3-04: registrar efectivo → entregado, pago manual y mail de entregado', async () => {
    const { id } = await efectivo();
    expect(await estado(id)).toBe('a_pagar_en_local');
    await e.ctx.servicios.pagosManuales.registrarEfectivo(id, admin);

    expect(await estado(id)).toBe('entregado');
    const [pago] = await e.ctx.db.select().from(pagos).where(eq(pagos.pedidoId, id));
    expect(pago).toMatchObject({
      medio: 'efectivo',
      estado: 'confirmado_manual',
      confirmadoPor: admin,
    });
    expect(await mails(id, 'entregado')).toHaveLength(1);
  });
});

describe('estados desde el panel (FR-032, FR-033, FR-044)', () => {
  test('US3-06: un pedido entregado no ofrece ninguna transición ni acción', async () => {
    const { id } = await efectivo();
    await e.ctx.servicios.pagosManuales.registrarEfectivo(id, admin);
    const d = await e.ctx.servicios.panelPedidos.detalle(id);
    expect(d.transicionesPermitidas).toEqual([]);
    expect(d.acciones).toEqual({ confirmarTransferencia: false, registrarEfectivo: false });
  });

  test('US3-07: transición inválida → 409 y queda el intento registrado como rechazado', async () => {
    const { id } = await efectivo();
    await e.ctx.servicios.pagosManuales.registrarEfectivo(id, admin);
    await expect(
      e.ctx.servicios.panelPedidos.moverEstado(id, { a: 'pendiente_pago' }, admin),
    ).rejects.toMatchObject({
      tipo: 'conflicto',
      codigo: 'TRANSICION_INVALIDA',
    });
    expect(await estado(id)).toBe('entregado');
    const rechazados = await e.ctx.db
      .select()
      .from(pedidoEventos)
      .where(and(eq(pedidoEventos.pedidoId, id), eq(pedidoEventos.rechazado, true)));
    expect(rechazados).toEqual([
      expect.objectContaining({ de: 'entregado', a: 'pendiente_pago', actor: admin }),
    ]);
  });

  test('pasar a pagado a mano no se ofrece: hay que usar "Confirmar transferencia"', async () => {
    const { id } = await transferencia();
    const d = await e.ctx.servicios.panelPedidos.detalle(id);
    expect(d.transicionesPermitidas).toEqual(['cancelado']);
    expect(d.acciones.confirmarTransferencia).toBe(true);
    await expect(
      e.ctx.servicios.panelPedidos.moverEstado(id, { a: 'pagado' }, admin),
    ).rejects.toMatchObject({
      codigo: 'USAR_ACCION_DE_PAGO',
    });
    expect(await estado(id)).toBe('pendiente_pago');
  });

  test('retiro pagado → listo para retirar → entregado, con un mail en cada paso', async () => {
    const { id } = await transferencia();
    await e.ctx.servicios.pagosManuales.confirmarTransferencia(id, admin);
    expect((await e.ctx.servicios.panelPedidos.detalle(id)).transicionesPermitidas).toEqual([
      'listo_para_retirar',
      'cancelado',
    ]);
    await e.ctx.servicios.panelPedidos.moverEstado(id, { a: 'listo_para_retirar' }, admin);
    await e.ctx.servicios.panelPedidos.moverEstado(id, { a: 'entregado' }, admin);
    expect(await estado(id)).toBe('entregado');
    expect(await mails(id, 'listo_para_retirar')).toHaveLength(1);
    expect(await mails(id, 'entregado')).toHaveLength(1);
  });

  test('cancelar un pedido a pagar en el local devuelve el stock y guarda el motivo', async () => {
    const antes = await stockDe(e, e.productoId);
    const { id } = await efectivo();
    await e.ctx.servicios.panelPedidos.moverEstado(
      id,
      { a: 'cancelado', motivo: 'No vino a buscarlo' },
      admin,
    );
    expect(await stockDe(e, e.productoId)).toBe(antes);
    const [evento] = await e.ctx.db
      .select()
      .from(pedidoEventos)
      .where(and(eq(pedidoEventos.pedidoId, id), eq(pedidoEventos.a, 'cancelado')));
    expect(evento?.motivo).toBe('No vino a buscarlo');
  });
});

describe('listado del panel (FR-043, FR-034)', () => {
  test('nuevos primero, filtro por estado y antigüedad de los que esperan en el local', async () => {
    const viejo = await efectivo();
    e.reloj.avanzar(3 * DIA);
    const nuevo = await transferencia();

    const todos = await e.ctx.servicios.panelPedidos.listar({ pagina: 1, porPagina: 100 });
    expect(todos.items[0]?.id).toBe(nuevo.id);
    expect(todos.total).toBe(todos.items.length);

    const enLocal = await e.ctx.servicios.panelPedidos.listar({
      estado: 'a_pagar_en_local',
      pagina: 1,
      porPagina: 100,
    });
    expect(enLocal.items.every((p) => p.estado === 'a_pagar_en_local')).toBe(true);
    expect(enLocal.items.find((p) => p.id === viejo.id)).toMatchObject({
      diasEsperando: 3,
      destacado: true,
    });

    const fila = todos.items.find((p) => p.id === nuevo.id);
    expect(fila).toMatchObject({ diasEsperando: null, destacado: false, comprador: 'Laura Pérez' });

    const c = await e.ctx.servicios.panelPedidos.contadores();
    expect(c.pedidosDestacados).toBeGreaterThanOrEqual(1);
  });
});
