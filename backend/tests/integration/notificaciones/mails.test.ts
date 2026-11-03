import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { revalidadorNulo } from '../../../src/adapters/revalidador.js';
import { productos } from '../../../src/modules/catalogo/infrastructure/schema.js';
import { configuracion } from '../../../src/modules/configuracion/infrastructure/schema.js';
import { crearDespachador } from '../../../src/modules/notificaciones/application/despachador.js';
import { todosLosEventosDeMail } from '../../../src/modules/notificaciones/application/eventos.js';
import { outboxMensajes } from '../../../src/modules/notificaciones/infrastructure/schema.js';
import {
  eventosConPlantilla,
  renderizar,
} from '../../../src/modules/notificaciones/plantillas/index.js';
import { pesos } from '../../../src/modules/notificaciones/plantillas/layout.js';
import { MINUTO } from '../../../src/shared-kernel/reloj.js';
import { COMPRADOR, prepararCompra, solicitud, type EscenarioCompra } from '../../setup/compra.js';
import { DATOS_MAIL_DE_EJEMPLO } from '../../setup/datos-mail.js';
import { idDeAdmin } from '../../setup/sesion.js';

let e: EscenarioCompra;
let admin: string;
let despachar: ReturnType<typeof crearDespachador>;

beforeAll(async () => {
  e = await prepararCompra();
  admin = await idDeAdmin(e.ctx);
  await e.ctx.db
    .update(configuracion)
    .set({
      bancoTitular: 'La Casa de las Baterías SRL',
      bancoCbu: '0000003100012345678901',
      bancoAlias: 'CASA.BATERIAS.MDP',
      bancoCuit: '30-71234567-8',
      comercioRazonSocial: 'La Casa de las Baterías SRL',
      comercioCuit: '30-71234567-8',
      whatsapp: '5492235123456',
      googleResenasUrl: 'https://g.page/r/casa-de-las-baterias/review',
    })
    .where(eq(configuracion.id, 1));
  // Varios pedidos por test: alcanza con el stock de sobra.
  await e.ctx.db.update(productos).set({ stock: 100 }).where(eq(productos.id, e.productoId));
  despachar = crearDespachador({
    mailer: e.mailer,
    revalidador: revalidadorNulo,
    mailAdmin: 'admin@tienda.test',
  });
});

afterAll(async () => {
  await e.ctx.cerrar();
});

beforeEach(async () => {
  await e.ctx.db.delete(outboxMensajes);
  e.mailer.enviados.length = 0;
  e.mailer.caido = false;
});

/** Corre el worker del outbox una vez, como cada 10 segundos en producción. */
const enviarPendientes = () => e.ctx.outbox.procesarLote(despachar, 100);

const delComprador = () => e.mailer.enviados.filter((m) => m.para === COMPRADOR.email);
const delAdmin = () => e.mailer.enviados.filter((m) => m.para === 'admin@tienda.test');

describe('avisos por mail (US4)', () => {
  test('US4-01: transferencia → comprador con CBU, alias, monto y plazo; admin con enlace al panel', async () => {
    const { id, numero, total } = await e.ctx.servicios.pedidos.crear(solicitud(e));
    await enviarPendientes();

    const [comprador] = delComprador();
    expect(comprador?.asunto).toBe(`Recibimos tu pedido #${numero}`);
    for (const parte of [comprador?.html, comprador?.texto]) {
      expect(parte).toContain('0000003100012345678901');
      expect(parte).toContain('CASA.BATERIAS.MDP');
      expect(parte).toContain(pesos(total));
      expect(parte).toContain('48 horas');
      expect(parte).toContain('Seguí tu pedido');
    }
    // Pie con los datos del comercio y botón de WhatsApp (FR-038).
    expect(comprador?.html).toContain('CUIT 30-71234567-8');
    expect(comprador?.html).toContain('https://wa.me/5492235123456');

    const [aviso] = delAdmin();
    expect(aviso?.asunto).toContain(`Nuevo pedido #${numero}`);
    expect(aviso?.html).toContain(`http://tienda.test/panel/pedidos/${id}`);
  });

  test('US4-02: "Vamos en camino" con el número de pedido', async () => {
    const { id, numero } = await e.ctx.servicios.pedidos.crear(
      solicitud(e, { entrega: 'colocacion', zonaId: e.zonaMdp }),
    );
    await e.ctx.servicios.pagosManuales.confirmarTransferencia(id, admin);
    await e.ctx.servicios.panelPedidos.moverEstado(id, { a: 'en_camino' }, admin);
    await enviarPendientes();

    const enCamino = delComprador().find((m) => m.asunto.startsWith('Vamos en camino'));
    expect(enCamino?.asunto).toBe(`Vamos en camino · pedido #${numero}`);
    expect(enCamino?.html).toContain(`#${numero}`);
    expect(enCamino?.texto).toContain('Colocación a domicilio');
  });

  test('US4-03: ningún mail al comprador contiene el DNI, en todo el ciclo', async () => {
    const colocado = await e.ctx.servicios.pedidos.crear(
      solicitud(e, { entrega: 'colocacion', zonaId: e.zonaMdp }),
    );
    await e.ctx.servicios.pagosManuales.confirmarTransferencia(colocado.id, admin);
    await e.ctx.servicios.panelPedidos.moverEstado(colocado.id, { a: 'en_camino' }, admin);
    await e.ctx.servicios.panelPedidos.moverEstado(colocado.id, { a: 'entregado' }, admin);
    const retirado = await e.ctx.servicios.pedidos.crear(solicitud(e));
    await e.ctx.servicios.pagosManuales.confirmarTransferencia(retirado.id, admin);
    await e.ctx.servicios.panelPedidos.moverEstado(retirado.id, { a: 'listo_para_retirar' }, admin);
    const cancelado = await e.ctx.servicios.pedidos.crear(solicitud(e, { medioPago: 'efectivo' }));
    await e.ctx.servicios.panelPedidos.moverEstado(
      cancelado.id,
      { a: 'cancelado', motivo: 'no vino' },
      admin,
    );
    await enviarPendientes();

    const asuntos = delComprador().map((m) => m.asunto.split(' ')[0]);
    expect(asuntos).toEqual(
      expect.arrayContaining(['Recibimos', 'Pago', 'Vamos', '¡Listo!', 'Tu', 'Pedido']),
    );
    for (const m of e.mailer.enviados) {
      expect(`${m.asunto} ${m.html} ${m.texto}`).not.toContain(COMPRADOR.dni);
    }
    // Ni siquiera se guarda en la cola de mails.
    for (const fila of await e.ctx.db.select().from(outboxMensajes)) {
      expect(JSON.stringify(fila.datos)).not.toContain(COMPRADOR.dni);
    }
  });

  test('US4-04: con el servicio de mails caído el pedido se crea y el mail sale al reintentar', async () => {
    e.mailer.caido = true;
    const { id, numero } = await e.ctx.servicios.pedidos.crear(solicitud(e));
    expect(id).toBeTruthy();

    const intento = await enviarPendientes();
    expect(intento.reintentos).toBe(2);
    expect(e.mailer.enviados).toHaveLength(0);
    const filas = await e.ctx.db
      .select()
      .from(outboxMensajes)
      .where(eq(outboxMensajes.pedidoId, id));
    expect(filas.every((f) => f.estado === 'pendiente' && f.ultimoError?.includes('caído'))).toBe(
      true,
    );

    e.mailer.caido = false;
    e.reloj.avanzar(MINUTO);
    expect((await enviarPendientes()).enviados).toBe(2);
    expect(delComprador()[0]?.asunto).toBe(`Recibimos tu pedido #${numero}`);
  });

  test('US4-05: el mismo pago aprobado procesado dos veces → un solo mail', async () => {
    const { id, total } = await e.ctx.servicios.pedidos.crear(
      solicitud(e, { medioPago: 'mercadopago' }),
    );
    e.pasarela.registrarPago('5001', id, 'approved', BigInt(total));
    for (const requestId of ['req-a', 'req-b']) {
      await e.ctx.servicios.pagosMp.procesar({
        tipo: 'payment',
        idPago: '5001',
        requestId,
        firma: e.pasarela.firmar('5001', requestId),
      });
    }
    await enviarPendientes();
    expect(delComprador().filter((m) => m.asunto.startsWith('Pago confirmado'))).toHaveLength(1);
    expect(delAdmin().filter((m) => m.asunto.startsWith('Pago confirmado'))).toHaveLength(1);
  });

  test('US6-09: el mail de "entregado" lleva el enlace para dejar una reseña en Google', async () => {
    const { id } = await e.ctx.servicios.pedidos.crear(solicitud(e));
    await e.ctx.servicios.pagosManuales.confirmarTransferencia(id, admin);
    await e.ctx.servicios.panelPedidos.moverEstado(id, { a: 'listo_para_retirar' }, admin);
    await e.ctx.servicios.panelPedidos.moverEstado(id, { a: 'entregado' }, admin);
    await enviarPendientes();
    const entregado = delComprador().find((m) => m.asunto.startsWith('¡Listo!'));
    expect(entregado?.html).toContain('https://g.page/r/casa-de-las-baterias/review');
    expect(entregado?.texto).toContain('Dejanos tu opinión en Google');
  });

  test('una consulta de canje avisa al administrador con los datos para contactarlo', async () => {
    await e.ctx.servicios.canje.registrar({
      nombre: 'Juan Gómez',
      telefono: '223 400 1122',
      auto: 'Gol Trend 2015',
      localidad: 'Mar del Plata',
    });
    await enviarPendientes();
    const [aviso] = delAdmin();
    expect(aviso?.asunto).toBe('Consulta de canje de Juan Gómez');
    expect(aviso?.texto).toContain('223 400 1122');
    expect(aviso?.html).toContain('http://tienda.test/panel/canje');
  });
});

describe('plantillas', () => {
  const datos = DATOS_MAIL_DE_EJEMPLO;

  test('cada evento del mapa tiene su plantilla', () => {
    expect(eventosConPlantilla()).toEqual(expect.arrayContaining(todosLosEventosDeMail()));
  });

  test('efectivo: dice que se paga al retirar y hasta cuándo se la guardamos (clarify 2026-11-02)', async () => {
    const m = await renderizar('pedido_recibido', {
      ...datos,
      medioPago: 'efectivo',
      entrega: 'retiro',
      banco: null,
      venceEn: '2026-11-08T15:00:00.000Z',
    });
    expect(m.texto).toContain('La pagás en el local cuando pasás a retirarla.');
    expect(m.texto).toContain('Te la guardamos hasta el 8/11/26');
    expect(m.texto).not.toContain('CBU');
  });

  test.each(eventosConPlantilla())('"%s" se arma completa, en HTML y en texto', async (evento) => {
    const m = await renderizar(evento, datos);
    expect(m.asunto.length).toBeGreaterThan(5);
    for (const parte of [m.asunto, m.html, m.texto]) {
      expect(parte).not.toMatch(/undefined|NaN|\[object Object\]/);
    }
    expect(m.texto.length).toBeGreaterThan(40);
  });
});
