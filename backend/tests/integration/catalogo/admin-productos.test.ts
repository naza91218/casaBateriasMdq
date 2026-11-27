import { eq } from 'drizzle-orm';
import sharp from 'sharp';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { productoFotos, productos } from '../../../src/modules/catalogo/infrastructure/schema.js';
import { outboxMensajes } from '../../../src/modules/notificaciones/infrastructure/schema.js';
import { crearProducto, fotoDePrueba } from '../../setup/fixtures.js';
import { prepararCompra, solicitud, type EscenarioCompra } from '../../setup/compra.js';

let e: EscenarioCompra;

beforeAll(async () => {
  e = await prepararCompra();
});

beforeEach(async () => {
  await e.ctx.db.delete(outboxMensajes).where(eq(outboxMensajes.canal, 'revalidacion'));
});

afterAll(async () => {
  await e.ctx.cerrar();
});

const s = () => e.ctx.servicios;

async function productoConFoto(datos: Parameters<typeof crearProducto>[1]) {
  const p = await crearProducto(e.ctx.db, datos);
  await s().fotos.subir(p.id, await fotoDePrueba());
  return p;
}

async function etiquetasRevalidadas(): Promise<string[]> {
  const filas = await e.ctx.db
    .select()
    .from(outboxMensajes)
    .where(eq(outboxMensajes.canal, 'revalidacion'));
  return filas.flatMap((f) => (f.datos.etiquetas as string[]) ?? []);
}

describe('productos desde el panel (FR-045)', () => {
  test('US5-03: cambiar el precio se ve en la ficha pública y regenera esa página', async () => {
    const p = await productoConFoto({
      marca: 'Sermat',
      medida: '12x75',
      gama: 'reforzada',
      precio: 100_000,
    });
    await s().adminProductos.editar(p.id, { precioLista: 11_000_000 });

    const ficha = await s().catalogo.obtenerFicha(p.slug);
    expect(ficha.precios.lista).toBe(11_000_000);
    expect(await etiquetasRevalidadas()).toEqual(
      expect.arrayContaining(['catalogo', `producto:${p.slug}`]),
    );
  });

  test('US5-04: pausar lo saca de la tienda y no se puede comprar', async () => {
    const p = await productoConFoto({ marca: 'Herbo', medida: '12x90 alta', gama: 'reforzada' });
    await s().adminProductos.editar(p.id, { estado: 'pausado' });

    const lista = await s().catalogo.listar({ pagina: 1, porPagina: 100 });
    expect(lista.items.map((i) => i.id)).not.toContain(p.id);
    await expect(s().catalogo.obtenerFicha(p.slug)).rejects.toMatchObject({
      tipo: 'no_encontrado',
    });
    await expect(
      s().pedidos.cotizar({
        items: [{ productoId: p.id, cantidad: 1 }],
        entrega: 'retiro',
        medioPago: 'transferencia',
      }),
    ).rejects.toMatchObject({ codigo: 'STOCK_INSUFICIENTE' });
  });

  test('activar exige precio y al menos una foto', async () => {
    const sinFoto = await crearProducto(e.ctx.db, {
      marca: 'Volta',
      medida: '12x65',
      gama: 'economica',
      estado: 'pausado',
    });
    await expect(s().adminProductos.editar(sinFoto.id, { estado: 'activo' })).rejects.toMatchObject(
      {
        codigo: 'NO_SE_PUEDE_ACTIVAR',
        mensaje: 'Falta al menos una foto para publicarlo',
      },
    );

    const sinPrecio = await productoConFoto({
      marca: 'Volta',
      medida: '12x65',
      gama: 'economica',
      precio: 0,
      estado: 'pausado',
    });
    await expect(
      s().adminProductos.editar(sinPrecio.id, { estado: 'activo' }),
    ).rejects.toMatchObject({
      mensaje: 'Falta el precio para publicarlo',
    });
    // Con el precio en el mismo cambio, sí.
    const r = await s().adminProductos.editar(sinPrecio.id, {
      estado: 'activo',
      precioLista: 9_500_000,
    });
    expect(r).toMatchObject({ estado: 'activo', faltaParaActivar: [] });
  });

  test('alta manual: queda pausada, con slug único y avisa qué falta', async () => {
    const datos = {
      sku: 'MAN-1',
      nombre: 'Edna 12x110 Reforzada',
      marca: 'edna',
      medida: '12x110 alta',
      amperajeAh: 110,
      gama: 'reforzada' as const,
    };
    const a = await s().adminProductos.crear(datos);
    const b = await s().adminProductos.crear({ ...datos, sku: 'MAN-2' });
    expect(a).toMatchObject({
      estado: 'pausado',
      slug: 'edna-12x110-reforzada',
      faltaParaActivar: ['Falta el precio', 'Falta al menos una foto'],
    });
    expect(b.slug).toBe('edna-12x110-reforzada-2');
    await expect(s().adminProductos.crear(datos)).rejects.toMatchObject({
      campos: { sku: 'Ya existe un producto con ese código' },
    });
    await expect(
      s().adminProductos.crear({ ...datos, sku: 'MAN-3', marca: 'Moura' }),
    ).rejects.toMatchObject({ tipo: 'validacion' });
  });

  test('garantía: sale de la regla al crear y el admin la puede cambiar (reunión 2026-11-17)', async () => {
    const base = {
      nombre: 'Sermat 12x65 R',
      medida: '12x65',
      amperajeAh: 65,
      gama: 'reforzada' as const,
    };
    const sermat = await s().adminProductos.crear({ ...base, sku: 'GAR-1', marca: 'sermat' });
    const herbo = await s().adminProductos.crear({ ...base, sku: 'GAR-2', marca: 'herbo' });
    expect(sermat.garantiaMeses).toBe(18);
    expect(herbo.garantiaMeses).toBe(12);
    const editada = await s().adminProductos.editar(herbo.id, { garantiaMeses: 24 });
    expect(editada.garantiaMeses).toBe(24);
  });

  test('búsqueda por nombre, código o medida; "%" se busca como texto', async () => {
    await crearProducto(e.ctx.db, {
      marca: 'Herbo',
      medida: '12x160',
      gama: 'reforzada',
      nombre: 'Herbo Camión 160',
    });
    const porNombre = await s().adminProductos.listar({ q: 'camión', pagina: 1, porPagina: 50 });
    expect(porNombre.items.map((i) => i.nombre)).toEqual(['Herbo Camión 160']);
    const porMedida = await s().adminProductos.listar({ q: '12x160', pagina: 1, porPagina: 50 });
    expect(porMedida.items.every((i) => i.medida === '12x160')).toBe(true);
    expect((await s().adminProductos.listar({ q: '%', pagina: 1, porPagina: 50 })).items).toEqual(
      [],
    );
  });
});

describe('revisión en lote de lo importado (FR-070)', () => {
  test('US5-05: de 40 a revisar, habilitar 25 y eliminar 15 → la tienda muestra solo los 25', async () => {
    await e.ctx.db.update(productos).set({ estado: 'pausado' }); // la tienda arranca vacía
    const marcasLote = ['Sermat', 'Herbo', 'Volta', 'Edna'];
    const lote = [];
    for (let i = 0; i < 40; i++) {
      lote.push(
        await productoConFoto({
          marca: marcasLote[i % 4] ?? 'Herbo',
          medida: '12x65',
          gama: 'economica',
          estado: 'a_revisar',
        }),
      );
    }
    const habilitar = lote.slice(0, 25).map((p) => p.id);
    const eliminar = lote.slice(25).map((p) => p.id);
    const clavesEliminadas = (await e.ctx.db.select().from(productoFotos))
      .filter((f) => eliminar.includes(f.productoId))
      .map((f) => f.clave);

    const h = await s().adminProductos.revisar({ ids: habilitar, accion: 'habilitar' });
    const x = await s().adminProductos.revisar({ ids: eliminar, accion: 'eliminar' });

    expect(h.resultados.every((r) => r.resultado === 'activo')).toBe(true);
    expect(x.resultados.every((r) => r.resultado === 'eliminado')).toBe(true);
    const tienda = await s().catalogo.listar({ pagina: 1, porPagina: 100 });
    expect(tienda.items.map((i) => i.id).sort()).toEqual([...habilitar].sort());
    // Los eliminados no aparecen en ningún lado: ni en la base ni sus fotos.
    const panel = await s().adminProductos.listar({ pagina: 1, porPagina: 100 });
    expect(panel.items.map((i) => i.id)).not.toEqual(expect.arrayContaining([eliminar[0]]));
    expect(
      await e.ctx.db
        .select()
        .from(productos)
        .where(eq(productos.id, eliminar[0] ?? '')),
    ).toEqual([]);
    expect(clavesEliminadas.some((c) => e.almacenamiento.archivos.has(c))).toBe(false);
  });

  test('habilitar lo que no tiene precio lo deja pausado y dice por qué', async () => {
    const sinPrecio = await productoConFoto({
      marca: 'Herbo',
      medida: '12x75',
      gama: 'economica',
      precio: 0,
      estado: 'a_revisar',
    });
    const r = await s().adminProductos.revisar({
      ids: [sinPrecio.id, '0190a0a0-0000-7000-8000-000000000000'],
      accion: 'habilitar',
    });
    expect(r.resultados).toEqual([
      { id: sinPrecio.id, resultado: 'pausado', motivo: 'Falta el precio' },
      { id: '0190a0a0-0000-7000-8000-000000000000', resultado: 'no_encontrado', motivo: null },
    ]);
  });
});

describe('eliminar (FR-071)', () => {
  test('US5-06: con pedidos se archiva y el pedido viejo conserva nombre y precio', async () => {
    const p = await productoConFoto({
      marca: 'Sermat',
      medida: '12x65',
      gama: 'economica',
      precio: 100_000,
      nombre: 'Sermat Vieja 12x65',
    });
    const pedido = await s().pedidos.crear({
      ...solicitud(e),
      items: [{ productoId: p.id, cantidad: 1 }],
    });
    await s().adminProductos.editar(p.id, { precioLista: 15_000_000 });

    expect(await s().adminProductos.eliminar(p.id)).toEqual({ resultado: 'archivado' });
    await expect(s().adminProductos.obtener(p.id)).rejects.toMatchObject({ tipo: 'no_encontrado' });
    await expect(s().catalogo.obtenerFicha(p.slug)).rejects.toMatchObject({
      tipo: 'no_encontrado',
    });

    const detalle = await s().panelPedidos.detalle(pedido.id);
    expect(detalle.items).toEqual([
      { nombre: 'Sermat Vieja 12x65', cantidad: 1, precioUnitario: 10_000_000 },
    ]);
  });

  test('sin pedidos se borra del todo, con sus fotos', async () => {
    const p = await productoConFoto({ marca: 'Volta', medida: '12x65', gama: 'economica' });
    const [foto] = await e.ctx.db
      .select()
      .from(productoFotos)
      .where(eq(productoFotos.productoId, p.id));
    expect(await s().adminProductos.eliminar(p.id)).toEqual({ resultado: 'eliminado' });
    expect(e.almacenamiento.archivos.has(foto?.clave ?? '')).toBe(false);
  });
});

describe('fotos (FR-045)', () => {
  test('se guardan como WebP de hasta 1600 px y sin EXIF', async () => {
    const p = await crearProducto(e.ctx.db, {
      marca: 'Herbo',
      medida: '12x65',
      gama: 'economica',
      estado: 'pausado',
    });
    const foto = await s().fotos.subir(p.id, await fotoDePrueba(4000, 3000));
    const [guardada] = await e.ctx.db
      .select()
      .from(productoFotos)
      .where(eq(productoFotos.id, foto.id));
    const meta = await sharp(
      e.almacenamiento.archivos.get(guardada?.clave ?? '')?.contenido,
    ).metadata();
    expect(meta).toMatchObject({ format: 'webp', width: 1600, height: 1200 });
    expect(meta.exif).toBeUndefined();
    expect(foto).toMatchObject({
      orden: 0,
      origen: 'propia',
      url: `http://fotos.test/${guardada?.clave}`,
    });
  });

  test('un archivo que no es foto se rechaza', async () => {
    const p = await crearProducto(e.ctx.db, {
      marca: 'Herbo',
      medida: '12x65',
      gama: 'economica',
      estado: 'pausado',
    });
    await expect(
      s().fotos.subir(p.id, Buffer.from('<script>no soy una foto</script>')),
    ).rejects.toMatchObject({ tipo: 'validacion' });
    expect(await s().fotos.deProducto(p.id)).toEqual([]);
  });

  test('ordenar y borrar renumeran sin huecos', async () => {
    const p = await crearProducto(e.ctx.db, {
      marca: 'Herbo',
      medida: '12x65',
      gama: 'economica',
      estado: 'pausado',
    });
    const [a, b, c] = [
      await s().fotos.subir(p.id, await fotoDePrueba()),
      await s().fotos.subir(p.id, await fotoDePrueba()),
      await s().fotos.subir(p.id, await fotoDePrueba()),
    ];
    const ordenadas = await s().fotos.ordenar(p.id, [c.id, a.id, b.id]);
    expect(ordenadas.map((f) => [f.id, f.orden])).toEqual([
      [c.id, 0],
      [a.id, 1],
      [b.id, 2],
    ]);
    const restantes = await s().fotos.borrar(p.id, a.id);
    expect(restantes.map((f) => [f.id, f.orden])).toEqual([
      [c.id, 0],
      [b.id, 1],
    ]);
    await expect(s().fotos.ordenar(p.id, [c.id])).rejects.toMatchObject({ tipo: 'validacion' });
  });

  test('no se puede borrar la única foto de un producto publicado', async () => {
    const p = await productoConFoto({ marca: 'Herbo', medida: '12x65', gama: 'economica' });
    const [foto] = await s().fotos.deProducto(p.id);
    await expect(s().fotos.borrar(p.id, foto?.id ?? '')).rejects.toMatchObject({
      codigo: 'ULTIMA_FOTO',
    });
    const quedan = await e.ctx.db
      .select()
      .from(productoFotos)
      .where(eq(productoFotos.productoId, p.id));
    expect(quedan).toHaveLength(1);
  });

  test('el producto activo regenera su página al cambiar fotos', async () => {
    const p = await productoConFoto({ marca: 'Herbo', medida: '12x65', gama: 'economica' });
    expect(await etiquetasRevalidadas()).toContain(`producto:${p.slug}`);
  });
});

describe('contador del resumen', () => {
  test('cuenta los productos a revisar', async () => {
    const antes = await s().adminProductos.contarARevisar();
    await crearProducto(e.ctx.db, {
      marca: 'Herbo',
      medida: '12x65',
      gama: 'economica',
      estado: 'a_revisar',
    });
    expect(await s().adminProductos.contarARevisar()).toBe(antes + 1);
  });
});
