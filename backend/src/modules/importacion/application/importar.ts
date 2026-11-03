import type { LookupAddress } from 'node:dns';
import { lookup as dnsLookup } from 'node:dns/promises';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import { BlockList, isIP, type LookupFunction } from 'node:net';
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
import {
  etiquetaVehiculo,
  guardarVehiculo,
} from '../../compatibilidad/application/admin-vehiculos.js';
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
const opcional = <T extends z.ZodType>(t: T) =>
  z.preprocess((v) => (v === '' ? undefined : v), t.optional());
const entero = (mensaje: string) => z.string().regex(/^\d+$/, mensaje).transform(Number);
const medida = z
  .string()
  .min(1, 'Falta la medida, por ejemplo 12x65')
  .transform((m) => m.toLowerCase().replace(/\s/g, ''))
  .pipe(z.string().regex(/^\d+x\d+$/, 'La medida va como 12x65'));

const FilaProducto = z.object({
  sku: z.string().min(1, 'Falta el código').max(60, 'El código puede tener hasta 60 caracteres'),
  marca: z.string().min(1, 'Falta la marca'),
  nombre: z
    .string()
    .min(1, 'Falta el nombre')
    .max(150, 'El nombre puede tener hasta 150 caracteres'),
  medida,
  amperaje_ah: z
    .string()
    .min(1, 'Falta el amperaje, por ejemplo 65')
    .pipe(entero('El amperaje es un número entero, por ejemplo 65'))
    .refine((n) => n > 0, 'El amperaje tiene que ser mayor a 0'),
  cca: opcional(entero('El CCA es un número entero, por ejemplo 450')),
  gama: z
    .string()
    .transform((g) => g.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''))
    .pipe(z.enum(['economica', 'reforzada'], 'La gama es "economica" o "reforzada"')),
  descripcion: opcional(z.string().max(3000, 'La descripción puede tener hasta 3000 caracteres')),
  precio_lista: opcional(
    z
      .string()
      .regex(
        /^\d+([.,]\d{1,2})?$/,
        'El precio va sin puntos de miles, por ejemplo 125000 o 125000.50',
      )
      .transform((p) => BigInt(Math.round(Number(p.replace(',', '.')) * 100))),
  ),
  stock: opcional(entero('El stock es un número entero, 0 o más')),
  fotos: opcional(z.string()),
  fuente: opcional(z.string().max(100, 'La fuente puede tener hasta 100 caracteres')),
});

const filaCompatibilidad = (anioMaximo: number) => {
  const anio = entero('El año es un número, por ejemplo 2015').refine(
    (a) => a >= 1950 && a <= anioMaximo,
    `El año va de 1950 a ${anioMaximo}`,
  );
  return z
    .object({
      marca_auto: z
        .string()
        .min(2, 'Falta la marca del auto')
        .max(60, 'La marca puede tener hasta 60 caracteres'),
      modelo: z
        .string()
        .min(1, 'Falta el modelo')
        .max(80, 'El modelo puede tener hasta 80 caracteres'),
      // Vacíos = el auto vale para todos sus años (clarify 2026-10-30).
      anio_desde: opcional(anio),
      anio_hasta: opcional(anio),
      motor: opcional(z.string().max(60, 'El motor puede tener hasta 60 caracteres')),
      medidas: z
        .string()
        .min(1, 'Falta la medida')
        .transform((m) =>
          m
            .split('|')
            .map((x) => x.trim().toLowerCase().replace(/\s/g, ''))
            .filter(Boolean),
        )
        .pipe(
          z
            .array(z.string().regex(/^\d+x\d+$/, 'Cada medida va como 12x65'))
            .min(1, 'Falta la medida'),
        ),
      fuente: opcional(z.string().max(100, 'La fuente puede tener hasta 100 caracteres')),
    })
    .refine((f) => (f.anio_desde === undefined) === (f.anio_hasta === undefined), {
      path: ['anio_hasta'],
      message: 'Cargá los dos años o ninguno',
    })
    .refine(
      (f) =>
        f.anio_desde === undefined || f.anio_hasta === undefined || f.anio_hasta >= f.anio_desde,
      {
        path: ['anio_hasta'],
        message: 'El año hasta no puede ser menor que el desde',
      },
    );
};

/** Redes que no son internet: la máquina, la red interna, la nube (metadatos) y reservadas. */
const NO_PUBLICAS = new BlockList();
for (const [red, bits] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['224.0.0.0', 3],
] as const) {
  NO_PUBLICAS.addSubnet(red, bits, 'ipv4');
}
// IPv6: sin especificar, la máquina, red interna, enlace local y multicast. Las que esconden una
// IPv4 adentro (::ffff:127.0.0.1, 64:ff9b::7f00:1) se revisan por la IPv4 (ver ipPublica): BlockList
// trata toda IPv4 como ::ffff:x.x.x.x, así que bloquear ese rango bloquearía todas.
for (const [red, bits] of [
  ['::', 127],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
] as const) {
  NO_PUBLICAS.addSubnet(red, bits, 'ipv6');
}

export function ipPublica(ip: string): boolean {
  const version = isIP(ip);
  if (!version) return false;
  const v4 = version === 6 ? ipv4Escondida(ip) : null;
  if (v4) return ipPublica(v4);
  return !NO_PUBLICAS.check(ip, version === 4 ? 'ipv4' : 'ipv6');
}

/** La IPv4 escondida en una IPv6 mapeada (::ffff:a.b.c.d) o de NAT64 (64:ff9b::/96). */
function ipv4Escondida(ip: string): string | null {
  const m = ip
    .toLowerCase()
    .match(/^(?:::ffff:|64:ff9b::)(?:(\d+\.\d+\.\d+\.\d+)|([0-9a-f]{1,4}):([0-9a-f]{1,4}))$/);
  if (!m) return null;
  if (m[1]) return m[1];
  const n = (parseInt(m[2]!, 16) << 16) | parseInt(m[3]!, 16);
  return [24, 16, 8, 0].map((d) => (n >>> d) & 255).join('.');
}

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
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal'))
    return false;
  return isIP(host) ? ipPublica(host) : true;
}

/**
 * Resuelve el nombre y deja conectar solo si todas sus IPs son públicas. Se controla al
 * conectarse, no antes: así un dominio que apunta a 127.0.0.1, o que cambia de IP entre el
 * control y la descarga (DNS rebinding), no llega a la red interna.
 */
export const lookupPublico: LookupFunction = (hostname, opciones, listo) => {
  dnsLookup(hostname, { all: true }).then(
    (direcciones) => {
      if (direcciones.length === 0 || !direcciones.every((d) => ipPublica(d.address))) {
        listo(new Error('la dirección no está permitida'), '', 0);
        return;
      }
      const [primera] = direcciones;
      if (opciones.all) (listo as (e: null, d: LookupAddress[]) => void)(null, direcciones);
      else listo(null, primera?.address ?? '', primera?.family ?? 4);
    },
    (error: NodeJS.ErrnoException) => listo(error, '', 0),
  );
};

/** Sin seguir redirecciones (podrían llevar a la red interna) y cortando a los 10 MB. */
function descargarFoto(url: string): Promise<Buffer> {
  if (!urlDeFotoPermitida(url)) return Promise.reject(new Error('la dirección no está permitida'));
  const cliente = url.startsWith('https:') ? https : http;
  return new Promise((ok, mal) => {
    const pedido = cliente.get(url, { lookup: lookupPublico, timeout: 15_000 }, (r) => {
      const estado = r.statusCode ?? 0;
      if (estado < 200 || estado > 299) {
        r.resume();
        mal(new Error(`respondió ${estado}`));
        return;
      }
      const partes: Buffer[] = [];
      let total = 0;
      r.on('data', (parte: Buffer) => {
        total += parte.length;
        if (total > MAX_BYTES_FOTO) pedido.destroy(new Error('pesa más de 10 MB'));
        else partes.push(parte);
      });
      r.on('end', () => ok(Buffer.concat(partes)));
      r.on('error', mal);
    });
    pedido.on('timeout', () => pedido.destroy(new Error('tardó más de 15 segundos')));
    pedido.on('error', mal);
  });
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

  async importar(
    tipo: TipoImportacion,
    archivo: string,
    contenido: Buffer,
    usuarioId: string | null,
  ): Promise<InformeImportacion> {
    if (contenido.length > MAX_BYTES)
      throw validacion({ archivo: 'La planilla pesa más de 5 MB. Dividila en partes' });
    const filas = leerCsv(contenido, tipo);

    const resultado =
      tipo === 'productos'
        ? await this.importarProductos(filas)
        : await this.importarCompatibilidades(filas);
    const filasError = new Set(
      resultado.errores.filter((e) => e.campo !== 'fotos').map((e) => e.fila),
    ).size;

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
    const medidasValidas = new Set(
      (await this.db.select({ codigo: medidas.codigo }).from(medidas)).map((m) => m.codigo),
    );

    for (const { fila, datos } of filas) {
      const v = FilaProducto.safeParse(datos);
      if (!v.success) {
        r.errores.push(...erroresZod(fila, v.error));
        continue;
      }
      const d = v.data;
      const marcaId = idsMarca.get(d.marca.trim().toLowerCase());
      if (!marcaId) {
        r.errores.push({
          fila,
          campo: 'marca',
          motivo: `La marca "${d.marca}" no está en la lista (Sermat, Herbo, Volta, Edna)`,
        });
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
          const comunes = {
            nombre: d.nombre,
            marcaId,
            medida: d.medida,
            amperajeAh: d.amperaje_ah,
            gama: d.gama,
          };
          const opcionales = {
            ...(d.cca !== undefined ? { cca: d.cca } : {}),
            ...(d.descripcion !== undefined ? { descripcion: d.descripcion } : {}),
            ...(d.precio_lista !== undefined ? { precioLista: d.precio_lista } : {}),
            ...(d.stock !== undefined ? { stock: d.stock } : {}),
            ...(d.fuente !== undefined ? { fuente: d.fuente } : {}),
          };
          if (actual) {
            // Lo existente conserva su estado: reimportar no despublica ni publica nada.
            await tx
              .update(productos)
              .set({ ...comunes, ...opcionales })
              .where(eq(productos.id, actual.id));
            const [conFotos] = await tx
              .select({ id: productoFotos.id })
              .from(productoFotos)
              .where(eq(productoFotos.productoId, actual.id))
              .limit(1);
            return {
              id: actual.id,
              slug: actual.slug,
              creado: false,
              visible: actual.estado === 'activo',
              sinFotos: !conFotos,
            };
          }
          const [nuevo] = await tx
            .insert(productos)
            .values({
              sku: d.sku,
              slug: await slugUnico(tx, d.nombre),
              estado: 'a_revisar',
              fuente: 'planilla',
              ...comunes,
              ...opcionales,
            })
            .returning({ id: productos.id, slug: productos.slug });
          if (!nuevo) throw new Error('No se creó el producto');
          return { id: nuevo.id, slug: nuevo.slug, creado: true, visible: false, sinFotos: true };
        });
        if (guardado.creado) r.creados++;
        else r.actualizados++;
        if (guardado.visible) r.etiquetas.push('catalogo', `producto:${guardado.slug}`);
        // Las fotos solo se cargan si el producto no tiene: reimportar no las duplica.
        if (d.fotos && guardado.sinFotos)
          r.errores.push(...(await this.cargarFotos(fila, guardado.id, d.fotos)));
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
            {
              marca: d.marca_auto,
              modelo: d.modelo,
              anioDesde: d.anio_desde ?? null,
              anioHasta: d.anio_hasta ?? null,
              motor: d.motor ?? null,
              medidas: d.medidas,
            },
            d.fuente ?? 'planilla',
          ),
        );
        if (creado) r.creados++;
        else r.actualizados++;
        r.etiquetas.push(etiquetaVehiculo(d.marca_auto, d.modelo));
      } catch (error) {
        const campo =
          error instanceof ErrorDeDominio && error.campos
            ? (Object.keys(error.campos)[0] ?? 'medidas')
            : 'medidas';
        r.errores.push({ fila, campo, motivo: motivoDeError(error) });
      }
    }
    return r;
  }

  /** Fotos de la marca, en orden. Una que falla no frena el producto: queda informada. */
  private async cargarFotos(
    fila: number,
    productoId: string,
    lista: string,
  ): Promise<ErrorDeFila[]> {
    const errores: ErrorDeFila[] = [];
    for (const ref of lista
      .split('|')
      .map((f) => f.trim())
      .filter(Boolean)) {
      try {
        const contenido = /^https?:\/\//i.test(ref)
          ? await this.descargar(ref)
          : await readFile(this.rutaLocal(ref));
        await this.fotos.subir(productoId, contenido, 'marca');
      } catch (error) {
        errores.push({
          fila,
          campo: 'fotos',
          motivo: `No se pudo cargar la foto "${ref}" (${motivoDeError(error)}); el producto se cargó sin ella`,
        });
      }
    }
    return errores;
  }

  private rutaLocal(ref: string): string {
    const ruta = resolve(this.carpetaFotos, ref);
    if (!ruta.startsWith(this.carpetaFotos + sep))
      throw new Error('la ruta está fuera de la carpeta de fotos');
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
    throw validacion({
      archivo: `No pudimos leer la planilla: ${motivoDeError(error)}. Guardala como CSV UTF-8 separado por comas`,
    });
  }
  if (registros.length === 0) throw validacion({ archivo: 'La planilla no tiene filas' });
  if (registros.length > MAX_FILAS)
    throw validacion({
      archivo: `La planilla tiene más de ${MAX_FILAS} filas. Dividila en partes`,
    });

  const presentes = new Set(Object.keys(registros[0]?.record ?? {}));
  const faltan = COLUMNAS[tipo].obligatorias.filter((c) => !presentes.has(c));
  if (faltan.length) throw validacion({ archivo: `Faltan las columnas: ${faltan.join(', ')}` });

  return registros.map(({ record, info }) => ({ fila: info.lines, datos: record }));
}

function erroresZod(fila: number, error: z.ZodError): ErrorDeFila[] {
  return error.issues.map((i) => ({ fila, campo: String(i.path[0] ?? 'fila'), motivo: i.message }));
}

function motivoDeError(error: unknown): string {
  if (error instanceof ErrorDeDominio)
    return error.campos ? Object.values(error.campos).join('; ') : error.mensaje;
  return error instanceof Error ? error.message : String(error);
}
