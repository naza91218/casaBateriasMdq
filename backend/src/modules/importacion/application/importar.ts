import { readFile } from 'node:fs/promises';
import { isIP } from 'node:net';
import { resolve, sep } from 'node:path';
import type { InformeImportacion, TipoImportacion } from '@casa/shared';
import { parse } from 'csv-parse/sync';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { BaseDeDatos } from '../../../platform/db.js';
import { ErrorDeDominio, validacion } from '../../../shared-kernel/errores.js';
import type { Reloj } from '../../../shared-kernel/reloj.js';
import { slugUnico } from '../../catalogo/application/admin-productos.js';
import type { ServicioFotos } from '../../catalogo/application/fotos.js';
import { marcas, medidas, productoFotos, productos } from '../../catalogo/infrastructure/schema.js';
import { etiquetaVehiculo, guardarVehiculo } from '../../compatibilidad/application/admin-vehiculos.js';
import type { Outbox } from '../../notificaciones/application/outbox.js';
import { importaciones, type ErrorDeFila } from '../infrastructure/schema.js';

export const MAX_FILAS = 5_000;
export const MAX_BYTES = 5 * 1024 * 1024;
const MAX_BYTES_FOTO = 10 * 1024 * 1024;

const COLUMNAS: Record<TipoImportacion, { obligatorias: string[]; opcionales: string[] }> = {
  productos: {
    obligatorias: ['sku', 'marca', 'nombre', 'medida', 'amperaje_ah', 'gama'],
    opcionales: ['cca', 'descripcion', 'precio_lista', 'stock', 'fotos', 'fuente'],
  },
  compatibilidades: {
    obligatorias: ['marca_auto', 'modelo', 'medidas'],
    opcionales: ['anio_desde', 'anio_hasta', 'motor', 'fuente'],
  },
};

// Una celda vacía es "no informado": no pisa el valor actual (contracts/importacion-csv.md).
const opcional = <T extends z.ZodType>(t: T) => z.preprocess((v) => (v === '' ? undefined : v), t.optional());
const entero = (mensaje: string) => z.string().regex(/^\d+$/, mensaje).transform(Number);
const medida = z
  .string()
  .transform((m) => m.toLowerCase().replace(/\s/g, ''))
  .pipe(z.string().regex(/^\d+x\d+$/, 'La medida va como 12x65'));

const FilaProducto = z.object({
  sku: z.string().min(1, 'Falta el código').max(60),
  marca: z.string().min(1, 'Falta la marca'),
  nombre: z.string().min(1, 'Falta el nombre').max(150),
  medida,
  amperaje_ah: entero('El amperaje es un número entero, por ejemplo 65').refine((n) => n > 0, 'El amperaje tiene que ser mayor a 0'),
  cca: opcional(entero('El CCA es un número entero, por ejemplo 450')),
  gama: z
    .string()
    .transform((g) => g.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''))
    .pipe(z.enum(['economica', 'reforzada'], 'La gama es "economica" o "reforzada"')),
  descripcion: opcional(z.string().max(3000)),
  precio_lista: opcional(
    z
      .string()
      .regex(/^\d+([.,]\d{1,2})?$/, 'El precio va sin puntos de miles, por ejemplo 125000 o 125000.50')
      .transform((p) => BigInt(Math.round(Number(p.replace(',', '.')) * 100))),
  ),
  stock: opcional(entero('El stock es un número entero, 0 o más')),
  fotos: opcional(z.string()),
  fuente: opcional(z.string().max(100)),
});

const filaCompatibilidad = (anioMaximo: number) => {
  const anio = entero('El año es un número, por ejemplo 2015').refine(
    (a) => a >= 1950 && a <= anioMaximo,
    `El año va de 1950 a ${anioMaximo}`,
  );
  return z
    .object({
      marca_auto: z.string().min(2, 'Falta la marca del auto').max(60),
      modelo: z.string().min(1, 'Falta el modelo').max(80),
      // Vacíos = el auto vale para todos sus años (clarify 2026-10-30).
      anio_desde: opcional(anio),
      anio_hasta: opcional(anio),
      motor: opcional(z.string().max(60)),
      medidas: z
        .string()
        .min(1, 'Falta la medida')
        .transform((m) => m.split('|').map((x) => x.trim().toLowerCase().replace(/\s/g, '')).filter(Boolean))
        .pipe(z.array(z.string().regex(/^\d+x\d+$/, 'Cada medida va como 12x65')).min(1, 'Falta la medida')),
      fuente: opcional(z.string().max(100)),
    })
    .refine((f) => (f.anio_desde === undefined) === (f.anio_hasta === undefined), {
      path: ['anio_hasta'],
      message: 'Cargá los dos años o ninguno',
    })
    .refine((f) => f.anio_desde === undefined || f.anio_hasta === undefined || f.anio_hasta >= f.anio_desde, {
      path: ['anio_hasta'],
      message: 'El año hasta no puede ser menor que el desde',
    });
};

/** Para bajar fotos por URL: solo http(s) a direcciones públicas (evita que pidan al propio servidor). */
export function urlDeFotoPermitida(texto: string): boolean {
  let url: URL;
  try {
    url = new URL(texto);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal')) return false;
  if (isIP(host)) {
    return !/^(10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fc|fd|fe80)/.test(host);
  }
  return true;
}

async function descargarFoto(url: string): Promise<Buffer> {
  if (!urlDeFotoPermitida(url)) throw new Error('la dirección no está permitida');
  const r = await fetch(url, { signal: AbortSignal.timeout(15_000), redirect: 'error' });
  if (!r.ok) throw new Error(`respondió ${r.status}`);
  const largo = Number(r.headers.get('content-length') ?? 0);
  if (largo > MAX_BYTES_FOTO) throw new Error('pesa más de 10 MB');
  const contenido = Buffer.from(await r.arrayBuffer());
  if (contenido.length > MAX_BYTES_FOTO) throw new Error('pesa más de 10 MB');
  return contenido;
}

export interface OpcionesImportacion {
  /** Carpeta de donde se leen las fotos con ruta relativa (las que baja el scraper). */
  carpetaFotos: string;
  descargar?: (url: string) => Promise<Buffer>;
}

/**
 * Importación de planillas (FR-046, contracts/importacion-csv.md): cada fila se valida y se
 * guarda sola, así una fila con error no frena las demás (US5-01). Lo nuevo entra "a revisar"
 * (FR-070). Es una capa anticorrupción: el formato de la planilla no se filtra al dominio.
 */
export class ServicioImportacion {
  private readonly carpetaFotos: string;
  private readonly descargar: (url: string) => Promise<Buffer>;

  constructor(
    private readonly db: BaseDeDatos,
    private readonly fotos: ServicioFotos,
    private readonly outbox: Outbox,
    private readonly reloj: Reloj,
    opciones: OpcionesImportacion,
  ) {
    this.carpetaFotos = resolve(opciones.carpetaFotos);
    this.descargar = opciones.descargar ?? descargarFoto;
  }

  async importar(tipo: TipoImportacion, archivo: string, contenido: Buffer, usuarioId: string | null): Promise<InformeImportacion> {
    if (contenido.length > MAX_BYTES) throw validacion({ archivo: 'La planilla pesa más de 5 MB. Dividila en partes' });
    const filas = leerCsv(contenido, tipo);

    const resultado = tipo === 'productos' ? await this.importarProductos(filas) : await this.importarCompatibilidades(filas);
    const filasError = new Set(resultado.errores.filter((e) => e.campo !== 'fotos').map((e) => e.fila)).size;

    const [registro] = await this.db
      .insert(importaciones)
      .values({
        tipo,
        archivo: archivo.slice(0, 200),
        filasTotal: filas.length,
        filasOk: filas.length - filasError,
        filasError,
        creados: resultado.creados,
        actualizados: resultado.actualizados,
        errores: resultado.errores,
        usuarioId,
      })
      .returning({ id: importaciones.id });
    await this.outbox.revalidar(this.db, resultado.etiquetas);

    return {
      importacionId: registro?.id ?? '',
      filasTotal: filas.length,
      filasOk: filas.length - filasError,
      filasError,
      creados: resultado.creados,
      actualizados: resultado.actualizados,
      errores: resultado.errores,
    };
  }

  private async importarProductos(filas: FilaCsv[]): Promise<Resultado> {
    const r: Resultado = { creados: 0, actualizados: 0, errores: [], etiquetas: [] };
    const idsMarca = new Map<string, string>();
    for (const m of await this.db.select().from(marcas)) {
      idsMarca.set(m.nombre.toLowerCase(), m.id);
      idsMarca.set(m.slug, m.id);
    }
    const medidasValidas = new Set((await this.db.select({ codigo: medidas.codigo }).from(medidas)).map((m) => m.codigo));

    for (const { fila, datos } of filas) {
      const v = FilaProducto.safeParse(datos);
      if (!v.success) {
        r.errores.push(...erroresZod(fila, v.error));
        continue;
      }
      const d = v.data;
      const marcaId = idsMarca.get(d.marca.trim().toLowerCase());
      if (!marcaId) {
        r.errores.push({ fila, campo: 'marca', motivo: `La marca "${d.marca}" no está en la lista (Sermat, Herbo, Volta, Edna)` });
        continue;
      }
      if (!medidasValidas.has(d.medida)) {
        r.errores.push({ fila, campo: 'medida', motivo: `La medida ${d.medida} no existe` });
        continue;
      }

      try {
        const guardado = await this.db.transaction(async (tx) => {
          const [actual] = await tx
            .select({ id: productos.id, slug: productos.slug, estado: productos.estado })
            .from(productos)
            .where(eq(productos.sku, d.sku))
            .for('update');
          const comunes = { nombre: d.nombre, marcaId, medida: d.medida, amperajeAh: d.amperaje_ah, gama: d.gama };
          const opcionales = {
            ...(d.cca !== undefined ? { cca: d.cca } : {}),
            ...(d.descripcion !== undefined ? { descripcion: d.descripcion } : {}),
            ...(d.precio_lista !== undefined ? { precioLista: d.precio_lista } : {}),
            ...(d.stock !== undefined ? { stock: d.stock } : {}),
            ...(d.fuente !== undefined ? { fuente: d.fuente } : {}),
          };
          if (actual) {
            // Lo existente conserva su estado: reimportar no despublica ni publica nada.
            await tx.update(productos).set({ ...comunes, ...opcionales }).where(eq(productos.id, actual.id));
            const [conFotos] = await tx.select({ id: productoFotos.id }).from(productoFotos).where(eq(productoFotos.productoId, actual.id)).limit(1);
            return { id: actual.id, slug: actual.slug, creado: false, visible: actual.estado === 'activo', sinFotos: !conFotos };
          }
          const [nuevo] = await tx
            .insert(productos)
            .values({ sku: d.sku, slug: await slugUnico(tx, d.nombre), estado: 'a_revisar', fuente: 'planilla', ...comunes, ...opcionales })
            .returning({ id: productos.id, slug: productos.slug });
          if (!nuevo) throw new Error('No se creó el producto');
          return { id: nuevo.id, slug: nuevo.slug, creado: true, visible: false, sinFotos: true };
        });
        if (guardado.creado) r.creados++;
        else r.actualizados++;
        if (guardado.visible) r.etiquetas.push('catalogo', `producto:${guardado.slug}`);
        // Las fotos solo se cargan si el producto no tiene: reimportar no las duplica.
        if (d.fotos && guardado.sinFotos) r.errores.push(...(await this.cargarFotos(fila, guardado.id, d.fotos)));
      } catch (error) {
        r.errores.push({ fila, campo: 'sku', motivo: motivoDeError(error) });
      }
    }
    return r;
  }

  private async importarCompatibilidades(filas: FilaCsv[]): Promise<Resultado> {
    const r: Resultado = { creados: 0, actualizados: 0, errores: [], etiquetas: ['buscador'] };
    const esquema = filaCompatibilidad(this.reloj.ahora().getFullYear() + 1);
    for (const { fila, datos } of filas) {
      const v = esquema.safeParse(datos);
      if (!v.success) {
        r.errores.push(...erroresZod(fila, v.error));
        continue;
      }
      const d = v.data;
      try {
        const { creado } = await this.db.transaction((tx) =>
          guardarVehiculo(
            tx,
            { marca: d.marca_auto, modelo: d.modelo, anioDesde: d.anio_desde ?? null, anioHasta: d.anio_hasta ?? null, motor: d.motor ?? null, medidas: d.medidas },
            d.fuente ?? 'planilla',
          ),
        );
        if (creado) r.creados++;
        else r.actualizados++;
        r.etiquetas.push(etiquetaVehiculo(d.marca_auto, d.modelo));
      } catch (error) {
        const campo = error instanceof ErrorDeDominio && error.campos ? (Object.keys(error.campos)[0] ?? 'medidas') : 'medidas';
        r.errores.push({ fila, campo, motivo: motivoDeError(error) });
      }
    }
    return r;
  }

  /** Fotos de la marca, en orden. Una que falla no frena el producto: queda informada. */
  private async cargarFotos(fila: number, productoId: string, lista: string): Promise<ErrorDeFila[]> {
    const errores: ErrorDeFila[] = [];
    for (const ref of lista.split('|').map((f) => f.trim()).filter(Boolean)) {
      try {
        const contenido = /^https?:\/\//i.test(ref) ? await this.descargar(ref) : await readFile(this.rutaLocal(ref));
        await this.fotos.subir(productoId, contenido, 'marca');
      } catch (error) {
        errores.push({ fila, campo: 'fotos', motivo: `No se pudo cargar la foto "${ref}" (${motivoDeError(error)}); el producto se cargó sin ella` });
      }
    }
    return errores;
  }

  private rutaLocal(ref: string): string {
    const ruta = resolve(this.carpetaFotos, ref);
    if (!ruta.startsWith(this.carpetaFotos + sep)) throw new Error('la ruta está fuera de la carpeta de fotos');
    return ruta;
  }
}

interface FilaCsv {
  fila: number;
  datos: Record<string, string>;
}

interface Resultado {
  creados: number;
  actualizados: number;
  errores: ErrorDeFila[];
  etiquetas: string[];
}

/** Lee el CSV y controla encabezados y tamaño. Un archivo ilegible se rechaza entero. */
function leerCsv(contenido: Buffer, tipo: TipoImportacion): FilaCsv[] {
  let registros: { record: Record<string, string>; info: { lines: number } }[];
  try {
    registros = parse(contenido, {
      bom: true,
      columns: (encabezados: string[]) => encabezados.map((h) => h.trim().toLowerCase()),
      skip_empty_lines: true,
      trim: true,
      info: true,
      relax_column_count: true,
    });
  } catch (error) {
    throw validacion({ archivo: `No pudimos leer la planilla: ${motivoDeError(error)}. Guardala como CSV UTF-8 separado por comas` });
  }
  if (registros.length === 0) throw validacion({ archivo: 'La planilla no tiene filas' });
  if (registros.length > MAX_FILAS) throw validacion({ archivo: `La planilla tiene más de ${MAX_FILAS} filas. Dividila en partes` });

  const presentes = new Set(Object.keys(registros[0]?.record ?? {}));
  const faltan = COLUMNAS[tipo].obligatorias.filter((c) => !presentes.has(c));
  if (faltan.length) throw validacion({ archivo: `Faltan las columnas: ${faltan.join(', ')}` });

  return registros.map(({ record, info }) => ({ fila: info.lines, datos: record }));
}

function erroresZod(fila: number, error: z.ZodError): ErrorDeFila[] {
  return error.issues.map((i) => ({ fila, campo: String(i.path[0] ?? 'fila'), motivo: i.message }));
}

function motivoDeError(error: unknown): string {
  if (error instanceof ErrorDeDominio) return error.campos ? Object.values(error.campos).join('; ') : error.mensaje;
  return error instanceof Error ? error.message : String(error);
}
