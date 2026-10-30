import {
  ConfiguracionAdmin,
  ConsultaCanjeAdmin,
  ErrorRespuesta,
  FotoAdmin,
  InformeImportacion,
  ListaProductosAdmin,
  ListaVehiculosAdmin,
  ProductoAdmin,
  ResultadoRevision,
  ResumenAdmin,
  VehiculoAdmin,
  ZonaAdmin,
} from '@casa/shared';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { z } from 'zod';
import { construirServidor } from '../../../src/http/server.js';
import { prepararCompra, type EscenarioCompra } from '../../setup/compra.js';
import { fotoDePrueba } from '../../setup/fixtures.js';
import { multipart } from '../../setup/multipart.js';
import { cookieDeAdmin } from '../../setup/sesion.js';

let e: EscenarioCompra;
let app: FastifyInstance;
let cookies: { sesion: string };

beforeAll(async () => {
  e = await prepararCompra();
  app = await construirServidor(e.ctx, { sinLimites: true });
  await app.ready();
  cookies = await cookieDeAdmin(e.ctx);
});

afterAll(async () => {
  await app.close();
  await e.ctx.cerrar();
});

const api = (method: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string, payload?: object) =>
  app.inject({ method, url: `/api/v1/admin${url}`, cookies, ...(payload ? { payload } : {}) });

describe('el panel de catálogo exige sesión', () => {
  const id = '0190a0a0-0000-7000-8000-000000000000';
  test.each([
    ['GET', '/productos'],
    ['POST', '/productos'],
    ['PATCH', `/productos/${id}`],
    ['DELETE', `/productos/${id}`],
    ['POST', '/productos/revision'],
    ['POST', `/productos/${id}/fotos`],
    ['PATCH', `/productos/${id}/fotos/orden`],
    ['DELETE', `/productos/${id}/fotos/${id}`],
    ['POST', '/importaciones'],
    ['GET', '/vehiculos'],
    ['POST', '/vehiculos'],
    ['PATCH', `/vehiculos/${id}`],
    ['DELETE', `/vehiculos/${id}`],
    ['GET', '/configuracion'],
    ['PATCH', '/configuracion'],
    ['GET', '/zonas'],
    ['POST', '/zonas'],
    ['PATCH', `/zonas/${id}`],
    ['GET', '/consultas-canje'],
    ['GET', '/consultas-canje?formato=csv'],
    ['PATCH', `/consultas-canje/${id}`],
  ] as const)('%s %s sin sesión → 401', async (method, url) => {
    const r = await app.inject({ method, url: `/api/v1/admin${url}`, payload: method === 'GET' || method === 'DELETE' ? undefined : {} });
    expect(r.statusCode).toBe(401);
  });
});

describe('productos', () => {
  test('alta, fotos desde el celular, activar y aparece en la tienda', async () => {
    const alta = await api('POST', '/productos', {
      sku: 'CEL-1',
      nombre: 'Herbo Max 12x75',
      marca: 'herbo',
      medida: '12x75',
      amperajeAh: 75,
      gama: 'reforzada',
      precioLista: 15_000_000,
      stock: 3,
    });
    expect(alta.statusCode).toBe(201);
    const p = ProductoAdmin.parse(alta.json());
    expect(p.estado).toBe('pausado');

    const archivos = await Promise.all([fotoDePrueba(), fotoDePrueba()]);
    const form = multipart({}, archivos.map((contenido, i) => ({ campo: 'fotos', nombre: `foto${i}.jpg`, tipo: 'image/jpeg', contenido })));
    const subida = await app.inject({ method: 'POST', url: `/api/v1/admin/productos/${p.id}/fotos`, cookies, ...form });
    expect(subida.statusCode).toBe(201);
    const fotos = z.array(FotoAdmin).parse(subida.json());
    expect(fotos.map((f) => f.orden)).toEqual([0, 1]);

    const orden = await api('PATCH', `/productos/${p.id}/fotos/orden`, { ids: [fotos[1]?.id, fotos[0]?.id] });
    expect(z.array(FotoAdmin).parse(orden.json())[0]?.id).toBe(fotos[1]?.id);

    const activo = ProductoAdmin.parse((await api('PATCH', `/productos/${p.id}`, { estado: 'activo' })).json());
    expect(activo).toMatchObject({ estado: 'activo', faltaParaActivar: [] });

    const publico = await app.inject({ method: 'GET', url: `/api/v1/catalogo/productos/${p.slug}` });
    expect(publico.statusCode).toBe(200);
    expect(publico.json().fotos[0]).toBe(fotos[1]?.url);
  });

  test('subir algo que no es foto → 400 con mensaje claro', async () => {
    const p = ProductoAdmin.parse(
      (await api('POST', '/productos', { sku: 'CEL-2', nombre: 'Volta 12x65', marca: 'Volta', medida: '12x65', amperajeAh: 65, gama: 'economica' })).json(),
    );
    const form = multipart({}, [{ campo: 'fotos', nombre: 'virus.exe', tipo: 'image/jpeg', contenido: Buffer.from('MZ no soy una foto') }]);
    const r = await app.inject({ method: 'POST', url: `/api/v1/admin/productos/${p.id}/fotos`, cookies, ...form });
    expect(r.statusCode).toBe(400);
    expect(ErrorRespuesta.parse(r.json()).error.campos?.archivo).toContain('no es una foto válida');
  });

  test('activar sin foto → 422; precio negativo → 400', async () => {
    const p = ProductoAdmin.parse(
      (await api('POST', '/productos', { sku: 'CEL-3', nombre: 'Edna 12x65', marca: 'Edna', medida: '12x65', amperajeAh: 65, gama: 'economica', precioLista: 100 })).json(),
    );
    const r = await api('PATCH', `/productos/${p.id}`, { estado: 'activo' });
    expect(r.statusCode).toBe(422);
    expect(r.json().error.mensaje).toBe('Falta al menos una foto para publicarlo');
    expect((await api('PATCH', `/productos/${p.id}`, { precioLista: -5 })).statusCode).toBe(400);
    expect((await api('PATCH', `/productos/${p.id}`, {})).statusCode).toBe(400);
  });

  test('listado con filtros, revisión en lote y borrado', async () => {
    const lista = ListaProductosAdmin.parse((await api('GET', '/productos?q=edna&porPagina=10')).json());
    const edna = lista.items.find((i) => i.sku === 'CEL-3');
    expect(edna).toBeDefined();

    const revision = ResultadoRevision.parse((await api('POST', '/productos/revision', { ids: [edna?.id], accion: 'habilitar' })).json());
    expect(revision.resultados[0]).toMatchObject({ resultado: 'pausado', motivo: 'Falta al menos una foto' });

    expect((await api('DELETE', `/productos/${edna?.id}`)).json()).toEqual({ resultado: 'eliminado' });
    expect((await api('GET', `/productos/${edna?.id}`)).statusCode).toBe(404);
  });
});

describe('importación', () => {
  test('una planilla de productos devuelve el informe', async () => {
    const csv = 'sku,marca,nombre,medida,amperaje_ah,gama\nIMP-1,Herbo,Herbo 12x65,12x65,65,economica\nIMP-2,Herbo,Herbo 12x99,12x99,99,economica\n';
    const form = multipart({ tipo: 'productos' }, [{ campo: 'archivo', nombre: 'herbo.csv', tipo: 'text/csv', contenido: Buffer.from(csv) }]);
    const r = await app.inject({ method: 'POST', url: '/api/v1/admin/importaciones', cookies, ...form });
    expect(r.statusCode).toBe(200);
    const informe = InformeImportacion.parse(r.json());
    expect(informe).toMatchObject({ filasTotal: 2, filasOk: 1, filasError: 1, errores: [{ fila: 3, campo: 'medida' }] });

    const resumen = ResumenAdmin.parse((await api('GET', '/resumen')).json());
    expect(resumen.productosARevisar).toBeGreaterThanOrEqual(1);
  });

  test('sin tipo o sin archivo → 400', async () => {
    const sinTipo = multipart({}, [{ campo: 'archivo', nombre: 'a.csv', tipo: 'text/csv', contenido: Buffer.from('sku\n1') }]);
    expect((await app.inject({ method: 'POST', url: '/api/v1/admin/importaciones', cookies, ...sinTipo })).statusCode).toBe(400);
    const sinArchivo = multipart({ tipo: 'productos' }, []);
    expect((await app.inject({ method: 'POST', url: '/api/v1/admin/importaciones', cookies, ...sinArchivo })).statusCode).toBe(400);
  });
});

describe('vehículos', () => {
  test('alta, búsqueda, edición y baja; se ven en el buscador público', async () => {
    const alta = await api('POST', '/vehiculos', { marca: 'Peugeot', modelo: '208', anioDesde: 2013, anioHasta: 2024, medidas: ['12x65'] });
    expect(alta.statusCode).toBe(201);
    const v = VehiculoAdmin.parse(alta.json());

    const publico = await app.inject({ method: 'GET', url: '/api/v1/vehiculos/compatibles?marca=peugeot&modelo=208&anio=2020' });
    expect(publico.json().medidas).toEqual(['12x65']);

    expect((await api('POST', '/vehiculos', { marca: 'Peugeot', modelo: '208', anioDesde: 2013, anioHasta: 2024, medidas: ['12x75'] })).statusCode).toBe(400);
    expect(ListaVehiculosAdmin.parse((await api('GET', '/vehiculos?q=peugeot 208')).json()).items).toHaveLength(1);

    const editado = VehiculoAdmin.parse(
      (await api('PATCH', `/vehiculos/${v.id}`, { marca: 'Peugeot', modelo: '208', anioDesde: 2013, anioHasta: 2024, motor: '1.6', medidas: ['12x65', '12x75'] })).json(),
    );
    expect(editado).toMatchObject({ motor: '1.6', medidas: ['12x65', '12x75'] });

    expect((await api('POST', '/vehiculos', { marca: 'Peugeot', modelo: '208', anioDesde: 2024, anioHasta: 2013, medidas: ['12x65'] })).statusCode).toBe(400);
    expect((await api('DELETE', `/vehiculos/${v.id}`)).statusCode).toBe(204);
    expect((await api('DELETE', `/vehiculos/${v.id}`)).statusCode).toBe(404);
  });
});

describe('configuración y zonas', () => {
  test('lee y edita; valida CBU, descuento y URL con mensajes claros', async () => {
    ConfiguracionAdmin.parse((await api('GET', '/configuracion')).json());

    const malo = await api('PATCH', '/configuracion', { descuentoPct: 60, banco: { cbu: '123' }, googleResenasUrl: 'reseñas' });
    expect(malo.statusCode).toBe(400);
    const campos = ErrorRespuesta.parse(malo.json()).error.campos ?? {};
    expect(Object.values(campos)).toEqual(
      expect.arrayContaining(['El descuento va de 0 a 50', 'El CBU tiene 22 números', 'Pegá el enlace completo de las reseñas de Google']),
    );

    const ok = ConfiguracionAdmin.parse((await api('PATCH', '/configuracion', { descuentoPct: 15, horarios: [{ dias: 'Lunes a viernes', desde: '08:30', hasta: '18:00' }] })).json());
    expect(ok).toMatchObject({ descuentoPct: 15, horarios: [{ dias: 'Lunes a viernes' }] });
    expect((await app.inject({ method: 'GET', url: '/api/v1/configuracion/publica' })).json().descuentoPct).toBe(15);
  });

  test('zonas: alta, edición y listado', async () => {
    const z1 = ZonaAdmin.parse((await api('POST', '/zonas', { nombre: 'Sierra de los Padres', costoExtra: 800_000 })).json());
    expect(z1.activa).toBe(true);
    const z2 = ZonaAdmin.parse((await api('PATCH', `/zonas/${z1.id}`, { activa: false })).json());
    expect(z2.activa).toBe(false);
    expect(z.array(ZonaAdmin).parse((await api('GET', '/zonas')).json()).map((x) => x.nombre)).toContain('Sierra de los Padres');
  });
});

describe('consultas de canje (FR-004b)', () => {
  test('lista, cambia estado y descarga la planilla protegida contra fórmulas', async () => {
    await e.ctx.servicios.canje.registrar({ nombre: '=HYPERLINK("http://malo")', telefono: '223 400 1122', localidad: 'Mar del Plata', auto: 'Gol' });
    await e.ctx.servicios.canje.registrar({ nombre: 'Ana López', telefono: '223 400 3344', localidad: 'Mar del Plata' });

    const lista = z.array(ConsultaCanjeAdmin).parse((await api('GET', '/consultas-canje')).json());
    expect(lista.map((c) => c.nombre)).toEqual(['Ana López', '=HYPERLINK("http://malo")']);
    expect(lista[0]?.whatsapp.url).toMatch(/^https:\/\/wa\.me\/5492234003344\?text=/);

    const atendida = ConsultaCanjeAdmin.parse((await api('PATCH', `/consultas-canje/${lista[0]?.id}`, { estado: 'atendida' })).json());
    expect(atendida.estado).toBe('atendida');
    expect(z.array(ConsultaCanjeAdmin).parse((await api('GET', '/consultas-canje?estado=pendiente')).json())).toHaveLength(1);
    expect(ResumenAdmin.parse((await api('GET', '/resumen')).json()).consultasCanjePendientes).toBe(1);

    const csv = await api('GET', '/consultas-canje?formato=csv');
    expect(csv.headers['content-type']).toContain('text/csv');
    expect(csv.headers['content-disposition']).toContain('consultas-canje.csv');
    expect(csv.rawPayload.subarray(0, 3)).toEqual(Buffer.from([0xef, 0xbb, 0xbf]));
    const lineas = csv.body.slice(1).trim().split('\r\n'); // sin el BOM
    expect(lineas[0]).toBe('"Fecha";"Nombre";"Teléfono";"Batería usada";"Auto";"Localidad";"Producto";"Estado"');
    expect(lineas).toHaveLength(3);
    expect(csv.body).toContain(`"'=HYPERLINK(""http://malo"")"`);
  });
});

describe('autos sin años por HTTP (clarify 2026-10-30)', () => {
  test('se cargan desde el panel y el buscador público responde sin año', async () => {
    const alta = await api('POST', '/vehiculos', { marca: 'Renault', modelo: 'Kangoo', medidas: ['12x70'] });
    expect(alta.statusCode).toBe(201);
    expect(VehiculoAdmin.parse(alta.json())).toMatchObject({ anioDesde: null, anioHasta: null });

    expect((await app.inject({ method: 'GET', url: '/api/v1/vehiculos/anios?marca=renault&modelo=kangoo' })).json()).toEqual([]);
    const r = await app.inject({ method: 'GET', url: '/api/v1/vehiculos/compatibles?marca=renault&modelo=kangoo' });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ vehiculo: { anio: null }, medidas: ['12x70'] });

    const mitad = await api('POST', '/vehiculos', { marca: 'Renault', modelo: 'Kangoo', anioDesde: 2010, medidas: ['12x70'] });
    expect(mitad.statusCode).toBe(400);
    expect(ErrorRespuesta.parse(mitad.json()).error.campos?.anioHasta).toBe('Cargá los dos años o ninguno');
  });
});
