import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import sharp from 'sharp';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { sembrarBase } from '../../../src/platform/seed/base.js';
import { sembrarCatalogo } from '../../../src/platform/seed/catalogo.js';
import { productoFotos, productos } from '../../../src/modules/catalogo/infrastructure/schema.js';
import {
  ServicioImportacion,
  ipPublica,
  lookupPublico,
  urlDeFotoPermitida,
} from '../../../src/modules/importacion/application/importar.js';
import { importaciones } from '../../../src/modules/importacion/infrastructure/schema.js';
import { outboxMensajes } from '../../../src/modules/notificaciones/infrastructure/schema.js';
import {
  crearContextoDePrueba,
  prepararBase,
  type ContextoDePrueba,
} from '../../setup/contexto.js';
import { fotoDePrueba, vaciarCatalogo } from '../../setup/fixtures.js';

let p: ContextoDePrueba;
let carpetaFotos: string;
let importacion: ServicioImportacion;
const descargadas: string[] = [];

beforeAll(async () => {
  await prepararBase();
  p = crearContextoDePrueba();
  await sembrarBase(p.ctx.db, { mailAdmin: 'admin@tienda.test' });
  await sembrarCatalogo(p.ctx.db);
  carpetaFotos = await mkdtemp(join(tmpdir(), 'fotos-import-'));
  await mkdir(join(carpetaFotos, 'fotos'));
  await writeFile(join(carpetaFotos, 'fotos', 'herbo-12x65.jpg'), await fotoDePrueba());
  importacion = new ServicioImportacion(p.ctx.db, p.ctx.servicios.fotos, p.ctx.outbox, p.reloj, {
    carpetaFotos,
    descargar: async (url) => {
      descargadas.push(url);
      return fotoDePrueba();
    },
  });
});

beforeEach(async () => {
  await vaciarCatalogo(p.ctx.db);
});

afterAll(async () => {
  await p.ctx.cerrar();
});

const csv = (filas: string[]) => Buffer.from(filas.join('\n'));
const ENCABEZADO =
  'sku,marca,nombre,medida,amperaje_ah,cca,gama,descripcion,precio_lista,stock,fotos,fuente';
const productosPorSku = async (sku: string) =>
  p.ctx.db.select().from(productos).where(eq(productos.sku, sku));

describe('importación de productos (FR-046, FR-070)', () => {
  test('US5-01: 20 filas, 2 con medida inválida → 18 cargadas y el informe dice fila y motivo', async () => {
    const filas = Array.from({ length: 20 }, (_, i) => {
      const medida = i === 3 || i === 11 ? '12x999' : '12x65';
      return `HB-${i},Herbo,Herbo ${medida} n${i},${medida},65,450,economica,,120000,3,,herbo.com`;
    });
    const r = await importacion.importar(
      'productos',
      'herbo.csv',
      csv([ENCABEZADO, ...filas]),
      null,
    );

    expect(r).toMatchObject({
      filasTotal: 20,
      filasOk: 18,
      filasError: 2,
      creados: 18,
      actualizados: 0,
    });
    expect(r.errores).toEqual([
      { fila: 5, campo: 'medida', motivo: 'La medida 12x999 no existe' },
      { fila: 13, campo: 'medida', motivo: 'La medida 12x999 no existe' },
    ]);
    const cargados = await p.ctx.db.select().from(productos);
    expect(cargados).toHaveLength(18);
    expect(cargados.every((c) => c.estado === 'a_revisar')).toBe(true);
    const [registro] = await p.ctx.db
      .select()
      .from(importaciones)
      .where(eq(importaciones.id, r.importacionId));
    expect(registro).toMatchObject({ tipo: 'productos', filasOk: 18, filasError: 2 });
  });

  test('US5-02: un SKU existente se actualiza sin duplicarse y conserva su estado', async () => {
    await importacion.importar(
      'productos',
      'a.csv',
      csv([
        ENCABEZADO,
        'SM-1,Sermat,Sermat 12x65,12x65,65,,economica,Con 2 años de garantía,100000,4,,',
      ]),
      null,
    );
    await p.ctx.db.update(productos).set({ estado: 'activo' }).where(eq(productos.sku, 'SM-1'));

    const r = await importacion.importar(
      'productos',
      'b.csv',
      csv([ENCABEZADO, 'SM-1,Sermat,Sermat 12x65,12x65,65,,economica,,110000.50,,,']),
      null,
    );

    expect(r).toMatchObject({ creados: 0, actualizados: 1, filasError: 0 });
    const [producto, ...otros] = await productosPorSku('SM-1');
    expect(otros).toHaveLength(0);
    expect(producto).toMatchObject({
      precioLista: 11_000_050n,
      estado: 'activo',
      // Celdas vacías no pisan lo que había.
      descripcion: 'Con 2 años de garantía',
      stock: 4,
    });
    const revalidaciones = await p.ctx.db
      .select()
      .from(outboxMensajes)
      .where(eq(outboxMensajes.canal, 'revalidacion'));
    expect(revalidaciones.at(-1)?.datos.etiquetas).toEqual(
      expect.arrayContaining(['catalogo', `producto:${producto?.slug}`]),
    );
  });

  test('stock explícito en 0 sí se guarda', async () => {
    await importacion.importar(
      'productos',
      'a.csv',
      csv([ENCABEZADO, 'SM-2,Sermat,Sermat 12x75,12x75,75,,reforzada,,,7,,']),
      null,
    );
    await importacion.importar(
      'productos',
      'b.csv',
      csv([ENCABEZADO, 'SM-2,Sermat,Sermat 12x75,12x75,75,,reforzada,,,0,,']),
      null,
    );
    expect((await productosPorSku('SM-2'))[0]?.stock).toBe(0);
  });

  test('cada campo inválido se informa con un motivo que dice cómo corregirlo', async () => {
    const r = await importacion.importar(
      'productos',
      'malos.csv',
      csv([
        ENCABEZADO,
        'X-1,Moura,Moura 12x65,12x65,65,,economica,,,,,',
        'X-2,Herbo,Herbo 12x65,12x65,65,,premium,,,,,',
        'X-3,Herbo,Herbo 12x65,12x65,65,,economica,,125.000,,,',
        'X-4,Herbo,Herbo 12x65,12x65,sesenta,,economica,,,,,',
        ',Herbo,Sin código,12x65,65,,economica,,,,,',
      ]),
      null,
    );
    expect(r.filasError).toBe(5);
    expect(r.errores.map((e) => [e.fila, e.campo])).toEqual([
      [2, 'marca'],
      [3, 'gama'],
      [4, 'precio_lista'],
      [5, 'amperaje_ah'],
      [6, 'sku'],
    ]);
    expect(r.errores[2]?.motivo).toContain('sin puntos de miles');
  });

  test('acepta encabezados en otro orden, mayúsculas, BOM de Excel y "Económica" con tilde', async () => {
    const contenido = Buffer.concat([
      Buffer.from([0xef, 0xbb, 0xbf]),
      Buffer.from(
        'Nombre,SKU,Marca,Medida,Gama,Amperaje_Ah\nEdna 12x90,ED-1,edna,12X90 Alta,Económica,90\n',
      ),
    ]);
    const r = await importacion.importar('productos', 'excel.csv', contenido, null);
    expect(r.filasOk).toBe(1);
    expect((await productosPorSku('ED-1'))[0]).toMatchObject({
      medida: '12x90 alta',
      gama: 'economica',
    });
  });

  test('acepta el CSV de Excel en castellano: separado por ";" y en Windows-1252', async () => {
    const texto =
      'sku;marca;nombre;medida;amperaje_ah;gama;descripcion;precio_lista;stock\r\n' +
      'VO-1;Volta;Volta 75;12x75;75;Económica;"Caja chica; 11 placas";104000,50;3\r\n';
    // Windows-1252: la "ó" es un solo byte (0xF3), no UTF-8.
    const contenido = Buffer.from(texto, 'latin1');
    const r = await importacion.importar('productos', 'excel.csv', contenido, null);
    expect(r.errores).toEqual([]);
    expect((await productosPorSku('VO-1'))[0]).toMatchObject({
      gama: 'economica',
      descripcion: 'Caja chica; 11 placas',
      precioLista: 10_400_050n,
      stock: 3,
    });
  });

  test('si falta una columna obligatoria se rechaza la planilla entera', async () => {
    await expect(
      importacion.importar('productos', 'x.csv', csv(['sku,marca,nombre', 'A,Herbo,Algo']), null),
    ).rejects.toMatchObject({
      tipo: 'validacion',
      campos: { archivo: 'Faltan las columnas: medida, amperaje_ah, gama' },
    });
  });

  test('fotos por ruta local y por URL, en orden y como de la marca; reimportar no las duplica', async () => {
    const fila =
      'HB-F,Herbo,Herbo con fotos,12x65,65,,economica,,,,fotos/herbo-12x65.jpg|https://herbo.test/a.jpg,';
    const r = await importacion.importar('productos', 'f.csv', csv([ENCABEZADO, fila]), null);
    expect(r.errores).toEqual([]);
    expect(descargadas).toEqual(['https://herbo.test/a.jpg']);
    const [producto] = await productosPorSku('HB-F');
    const fotos = await p.ctx.db
      .select()
      .from(productoFotos)
      .where(eq(productoFotos.productoId, producto?.id ?? ''));
    expect(fotos.map((f) => [f.orden, f.origen])).toEqual([
      [0, 'marca'],
      [1, 'marca'],
    ]);

    await importacion.importar('productos', 'f.csv', csv([ENCABEZADO, fila]), null);
    expect(
      await p.ctx.db
        .select()
        .from(productoFotos)
        .where(eq(productoFotos.productoId, producto?.id ?? '')),
    ).toHaveLength(2);
  });

  test('una foto que no se puede cargar no frena el producto y queda informada', async () => {
    const r = await importacion.importar(
      'productos',
      'f.csv',
      csv([
        ENCABEZADO,
        'HB-G,Herbo,Herbo sin foto,12x65,65,,economica,,,,../../etc/passwd|fotos/no-existe.jpg,',
      ]),
      null,
    );
    expect(r).toMatchObject({ filasOk: 1, filasError: 0, creados: 1 });
    expect(r.errores.map((e) => e.campo)).toEqual(['fotos', 'fotos']);
    expect(r.errores[0]?.motivo).toContain('fuera de la carpeta');
  });

  test('la foto importada se guarda como WebP sin EXIF', async () => {
    await importacion.importar(
      'productos',
      'f.csv',
      csv([ENCABEZADO, 'HB-H,Herbo,Herbo H,12x65,65,,economica,,,,fotos/herbo-12x65.jpg,']),
      null,
    );
    const [archivo] = [...p.almacenamiento.archivos.values()].slice(-1);
    const meta = await sharp(archivo?.contenido).metadata();
    expect(meta.format).toBe('webp');
    expect(meta.exif).toBeUndefined();
  });
});

describe('importación de compatibilidades', () => {
  const ENC = 'marca_auto,modelo,anio_desde,anio_hasta,motor,medidas,fuente';

  test('US5-07: los autos importados aparecen en el buscador con su medida', async () => {
    const r = await importacion.importar(
      'compatibilidades',
      'autos.csv',
      csv([
        ENC,
        'Volkswagen,Gol Trend,2008,2023,,12x65,herbo.com',
        'Ford,Ranger,2012,2024,3.2 diésel,12x90alta|12x110 A,herbo.com',
      ]),
      null,
    );
    expect(r).toMatchObject({ filasOk: 2, creados: 2 });
    const gol = await p.ctx.servicios.buscador.compatibles('volkswagen', 'gol-trend', 2015);
    expect(gol.medidas).toEqual(['12x65']);
    const ranger = await p.ctx.servicios.buscador.compatibles('ford', 'ranger', 2020);
    expect(ranger.medidas).toEqual(['12x90 alta', '12x110 alta']);
  });

  test('reimportar el mismo auto reemplaza sus medidas sin duplicarlo', async () => {
    await importacion.importar(
      'compatibilidades',
      'a.csv',
      csv([ENC, 'Fiat,Cronos,2018,2024,,12x65,']),
      null,
    );
    const r = await importacion.importar(
      'compatibilidades',
      'b.csv',
      csv([ENC, 'Fiat,Cronos,2018,2024,,12x75,']),
      null,
    );
    expect(r).toMatchObject({ creados: 0, actualizados: 1 });
    expect((await p.ctx.servicios.buscador.compatibles('fiat', 'cronos', 2020)).medidas).toEqual([
      '12x75',
    ]);
  });

  test('años invertidos, fuera de rango o medida inexistente → error de esa fila', async () => {
    const r = await importacion.importar(
      'compatibilidades',
      'malos.csv',
      csv([
        ENC,
        'Fiat,Uno,2010,2005,,12x65,',
        'Fiat,Uno,1900,2005,,12x65,',
        'Fiat,Uno,2000,2005,,12x999,',
        'Fiat,Palio,2000,2010,,12x65,',
      ]),
      null,
    );
    expect(r).toMatchObject({ filasTotal: 4, filasOk: 1, filasError: 3 });
    expect(r.errores.map((e) => [e.fila, e.campo])).toEqual([
      [2, 'anio_hasta'],
      [3, 'anio_desde'],
      [4, 'medidas'],
    ]);
  });
});

describe('fotos por URL: solo direcciones públicas', () => {
  test.each([
    ['https://herbobaterias.com/img/12x65.jpg', true],
    ['http://localhost:4000/api/v1/salud', false],
    ['http://127.0.0.1/x.jpg', false],
    ['http://192.168.0.10/x.jpg', false],
    ['http://10.0.0.5/x.jpg', false],
    ['http://169.254.169.254/latest/meta-data', false],
    ['file:///etc/passwd', false],
    ['ftp://herbo.com/x.jpg', false],
    // Formas escondidas de la misma máquina o de la red interna.
    ['http://[::ffff:127.0.0.1]/x.jpg', false],
    ['http://[::1]/x.jpg', false],
    ['http://[::]/x.jpg', false],
    ['http://[fd00::5]/x.jpg', false],
    ['http://2130706433/x.jpg', false],
    ['http://0x7f.1/x.jpg', false],
    ['http://100.64.0.1/x.jpg', false],
    ['http://8.8.8.8/x.jpg', true],
  ])('%s → %s', (url, permitida) => {
    expect(urlDeFotoPermitida(url)).toBe(permitida);
  });

  test('un dominio que apunta a la red interna se frena al conectarse, no solo por el nombre', async () => {
    // Cualquier nombre que resuelva a la máquina (acá, localhost) se frena en la resolución,
    // aunque el control por nombre lo hubiera dejado pasar.
    const lookup = (host: string) =>
      new Promise<unknown>((ok, mal) =>
        lookupPublico(host, { all: true }, (error, direcciones) =>
          error ? mal(error) : ok(direcciones),
        ),
      );
    await expect(lookup('localhost')).rejects.toThrow('la dirección no está permitida');
    expect(ipPublica('93.184.215.14')).toBe(true);
    expect(ipPublica('::ffff:7f00:1')).toBe(false);
  });
});

describe('compatibilidades sin años (clarify 2026-10-30)', () => {
  const ENC = 'marca_auto,modelo,anio_desde,anio_hasta,motor,medidas,fuente';

  test('sin columnas ni valores de años se cargan para todos los años', async () => {
    const r = await importacion.importar(
      'compatibilidades',
      'sermat.csv',
      csv(['marca_auto,modelo,medidas', 'Fiat,Palio,12x65|12x70']),
      null,
    );
    expect(r).toMatchObject({ filasOk: 1, creados: 1 });
    expect(await p.ctx.servicios.buscador.anios('fiat', 'palio')).toEqual([]);
    expect((await p.ctx.servicios.buscador.compatibles('fiat', 'palio')).medidas).toEqual([
      '12x65',
      '12x70',
    ]);

    const otra = await importacion.importar(
      'compatibilidades',
      'sermat.csv',
      csv([ENC, 'Fiat,Palio,,,,12x65,']),
      null,
    );
    expect(otra).toMatchObject({ creados: 0, actualizados: 1 });
  });

  test('un solo año cargado es un error de esa fila', async () => {
    const r = await importacion.importar(
      'compatibilidades',
      'x.csv',
      csv([ENC, 'Fiat,Uno,2010,,,12x65,']),
      null,
    );
    expect(r.errores).toEqual([
      { fila: 2, campo: 'anio_hasta', motivo: 'Cargá los dos años o ninguno' },
    ]);
  });
});
