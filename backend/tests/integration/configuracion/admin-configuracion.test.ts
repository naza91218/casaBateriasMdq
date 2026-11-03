import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { outboxMensajes } from '../../../src/modules/notificaciones/infrastructure/schema.js';
import { prepararCompra, type EscenarioCompra } from '../../setup/compra.js';
import { fotoDePrueba } from '../../setup/fixtures.js';

let e: EscenarioCompra;

beforeAll(async () => {
  e = await prepararCompra();
  await e.ctx.servicios.fotos.subir(e.productoId, await fotoDePrueba());
});

afterAll(async () => {
  await e.ctx.cerrar();
});

const s = () => e.ctx.servicios;

describe('configuración desde el panel (FR-047)', () => {
  test('US5-08: pasar el descuento de 10 a 12 % cambia fichas y checkout', async () => {
    const ficha = async () =>
      (await s().catalogo.listar({ pagina: 1, porPagina: 10 })).items.find(
        (i) => i.id === e.productoId,
      );
    expect((await ficha())?.precios).toMatchObject({
      lista: 10_000_000,
      transferenciaOEfectivo: 9_000_000,
      descuentoPct: 10,
    });

    await s().adminConfiguracion.editar({ descuentoPct: 12 });

    expect((await ficha())?.precios).toMatchObject({
      lista: 10_000_000,
      transferenciaOEfectivo: 8_800_000,
      descuentoPct: 12,
    });
    const cot = await s().pedidos.cotizar({
      items: [{ productoId: e.productoId, cantidad: 1 }],
      entrega: 'retiro',
      medioPago: 'efectivo',
    });
    expect(cot).toMatchObject({ total: 8_800_000, descuentoPct: 12 });
    const reval = await e.ctx.db
      .select()
      .from(outboxMensajes)
      .where(eq(outboxMensajes.canal, 'revalidacion'));
    expect(reval.at(-1)?.datos.etiquetas).toEqual(['configuracion', 'catalogo']);
  });

  test('datos bancarios: se guardan, salen en el pedido por transferencia y no regeneran la tienda', async () => {
    const antes = (
      await e.ctx.db.select().from(outboxMensajes).where(eq(outboxMensajes.canal, 'revalidacion'))
    ).length;
    const c = await s().adminConfiguracion.editar({
      banco: {
        titular: 'La Casa de las Baterías SRL',
        cbu: '0110599520000001234567',
        alias: 'casa.baterias.mdp',
        cuit: '30-71234567-9',
      },
    });
    expect(c.banco).toEqual({
      titular: 'La Casa de las Baterías SRL',
      cbu: '0110599520000001234567',
      alias: 'casa.baterias.mdp',
      cuit: '30712345679',
    });
    const despues = (
      await e.ctx.db.select().from(outboxMensajes).where(eq(outboxMensajes.canal, 'revalidacion'))
    ).length;
    expect(despues).toBe(antes);
  });

  test('si cambia el CBU o el alias, avisa por mail quién lo cambió y cómo quedó (auditoría)', async () => {
    const avisos = () =>
      e.ctx.db
        .select()
        .from(outboxMensajes)
        .where(eq(outboxMensajes.evento, 'aviso_admin_datos_bancarios'));
    const previos = (await avisos()).length;
    await s().adminConfiguracion.editar(
      { banco: { cbu: '0000003100099999999999', alias: 'casa.baterias.mdp' } },
      'admin@tienda.test',
    );
    const nuevos = (await avisos()).slice(previos);
    expect(nuevos).toHaveLength(1);
    expect(nuevos[0]?.destinatario).toBe('admin');
    // Solo el CBU cambió: el alias quedó igual.
    expect(nuevos[0]?.datos).toEqual({
      quien: 'admin@tienda.test',
      cambios: [
        { nombre: 'CBU', antes: '0110599520000001234567', despues: '0000003100099999999999' },
      ],
    });

    // Cambiar otra cosa no avisa.
    await s().adminConfiguracion.editar({ descuentoPct: 10 });
    expect(await avisos()).toHaveLength(previos + 1);
  });

  test('los cambios parciales no pisan lo demás', async () => {
    await s().adminConfiguracion.editar({
      whatsapp: '5492235000000',
      comercio: { telefono: '223 470 0000' },
    });
    const c = await s().adminConfiguracion.obtener();
    expect(c).toMatchObject({ whatsapp: '5492235000000', banco: { alias: 'casa.baterias.mdp' } });
    expect(c.comercio).toMatchObject({
      telefono: '223 470 0000',
      domicilio: 'Av. Juan B. Justo 5766, Mar del Plata',
    });
    expect((await s().configuracion.obtenerPublica()).whatsapp).toBe('5492235000000');
  });
});

describe('zonas de colocación (FR-017)', () => {
  test('solo las activas se ofrecen en el checkout', async () => {
    const batan = await s().adminConfiguracion.crearZona({
      nombre: 'Batán',
      costoExtra: 500_000,
      activa: false,
    });
    const pedir = () =>
      s().pedidos.cotizar({
        items: [{ productoId: e.productoId, cantidad: 1 }],
        entrega: 'colocacion',
        zonaId: batan.id,
        medioPago: 'mercadopago',
      });

    expect((await s().configuracion.obtenerPublica()).zonas.map((z) => z.nombre)).not.toContain(
      'Batán',
    );
    await expect(pedir()).rejects.toMatchObject({
      campos: { zonaId: 'Elegí la zona donde vamos a colocarla' },
    });

    await s().adminConfiguracion.editarZona(batan.id, { activa: true });
    expect((await s().configuracion.obtenerPublica()).zonas.map((z) => z.nombre)).toContain(
      'Batán',
    );
    expect((await pedir()).costoZona).toBe(500_000);
  });

  test('no se repite el nombre de una zona', async () => {
    await expect(
      s().adminConfiguracion.crearZona({ nombre: 'mar del plata', costoExtra: 0, activa: true }),
    ).rejects.toMatchObject({
      campos: { nombre: 'Ya hay una zona con ese nombre' },
    });
  });
});
