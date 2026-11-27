import type {
  EdicionProducto,
  FiltroProductosAdmin,
  ListaProductosAdmin,
  NuevoProducto,
  ProductoAdmin,
  ResultadoRevision,
  RevisionProductos,
} from '@casa/shared';
import { and, asc, count, eq, ilike, ne, or, sql, type SQL } from 'drizzle-orm';
import type { BaseDeDatos, Ejecutor, Transaccion } from '../../../platform/db.js';
import { ErrorDeDominio, noEncontrado, validacion } from '../../../shared-kernel/errores.js';
import { slug as aSlug } from '../../../shared-kernel/slug.js';
import type { Outbox } from '../../notificaciones/application/outbox.js';
import { pedidoItems } from '../../pedidos/infrastructure/schema.js';
import { garantiaPorDefecto } from '../domain/precios.js';
import { marcas, medidas, productos } from '../infrastructure/schema.js';
import type { ServicioFotos } from './fotos.js';

type EstadoProducto = (typeof productos.$inferSelect)['estado'];

/** Lo que falta para publicar un producto: precio y al menos una foto (FR-045, FR-070). */
export function faltaParaActivar(precioLista: bigint, cantidadFotos: number): string[] {
  const falta: string[] = [];
  if (precioLista <= 0n) falta.push('Falta el precio');
  if (cantidadFotos === 0) falta.push('Falta al menos una foto');
  return falta;
}

/** `%` y `_` son comodines de LIKE: se escapan para buscar el texto tal cual. */
const textoLike = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

const columnas = {
  id: productos.id,
  sku: productos.sku,
  slug: productos.slug,
  nombre: productos.nombre,
  marcaNombre: marcas.nombre,
  marcaSlug: marcas.slug,
  medida: productos.medida,
  gama: productos.gama,
  amperajeAh: productos.amperajeAh,
  cca: productos.cca,
  descripcion: productos.descripcion,
  precioLista: productos.precioLista,
  stock: productos.stock,
  garantiaMeses: productos.garantiaMeses,
  estado: productos.estado,
  fuente: productos.fuente,
  actualizadoEn: productos.actualizadoEn,
};

/**
 * Productos desde el panel. Los archivados no se ven ni acá ni en la tienda; solo los conservan
 * los pedidos viejos (FR-071).
 */
export class ServicioAdminProductos {
  constructor(
    private readonly db: BaseDeDatos,
    private readonly fotos: ServicioFotos,
    private readonly outbox: Outbox,
  ) {}

  async listar(f: FiltroProductosAdmin): Promise<ListaProductosAdmin> {
    const condiciones: SQL[] = [ne(productos.estado, 'archivado')];
    if (f.estado) condiciones.push(eq(productos.estado, f.estado));
    if (f.marca) condiciones.push(eq(marcas.slug, f.marca));
    if (f.q) {
      const buscado = or(
        ilike(productos.nombre, textoLike(f.q)),
        ilike(productos.sku, textoLike(f.q)),
        eq(productos.medida, f.q),
      );
      if (buscado) condiciones.push(buscado);
    }
    const donde = and(...condiciones);
    const [filas, [total]] = await Promise.all([
      this.db
        .select(columnas)
        .from(productos)
        .innerJoin(marcas, eq(marcas.id, productos.marcaId))
        .where(donde)
        // a_revisar primero (orden del enum), después por nombre.
        .orderBy(asc(productos.estado), asc(productos.nombre))
        .limit(f.porPagina)
        .offset((f.pagina - 1) * f.porPagina),
      this.db
        .select({ n: count() })
        .from(productos)
        .innerJoin(marcas, eq(marcas.id, productos.marcaId))
        .where(donde),
    ]);
    const fotos = await this.fotos.deProductos(filas.map((p) => p.id));
    return {
      items: filas.map((p) => this.aProducto(p, fotos.get(p.id) ?? [])),
      total: total?.n ?? 0,
      pagina: f.pagina,
      porPagina: f.porPagina,
    };
  }

  async obtener(id: string, ej: Ejecutor = this.db): Promise<ProductoAdmin> {
    const [p] = await ej
      .select(columnas)
      .from(productos)
      .innerJoin(marcas, eq(marcas.id, productos.marcaId))
      .where(and(eq(productos.id, id), ne(productos.estado, 'archivado')));
    if (!p) throw noEncontrado('No encontramos ese producto');
    return this.aProducto(p, await this.fotos.deProducto(id, ej));
  }

  /** Alta manual: queda pausado hasta tener precio y foto. */
  async crear(d: NuevoProducto): Promise<ProductoAdmin> {
    const id = await this.db.transaction(async (tx) => {
      const [existe] = await tx
        .select({ id: productos.id })
        .from(productos)
        .where(eq(productos.sku, d.sku));
      if (existe) throw validacion({ sku: 'Ya existe un producto con ese código' });
      const [p] = await tx
        .insert(productos)
        .values({
          sku: d.sku,
          slug: await slugUnico(tx, d.nombre),
          nombre: d.nombre,
          marcaId: await idMarca(tx, d.marca),
          medida: await medidaExistente(tx, d.medida),
          amperajeAh: d.amperajeAh,
          cca: d.cca ?? null,
          gama: d.gama,
          descripcion: d.descripcion ?? '',
          precioLista: BigInt(d.precioLista ?? 0),
          stock: d.stock ?? 0,
          garantiaMeses: d.garantiaMeses ?? garantiaPorDefecto(d.marca),
          estado: 'pausado',
          fuente: 'manual',
        })
        .returning({ id: productos.id });
      if (!p) throw new Error('No se creó el producto');
      return p.id;
    });
    return this.obtener(id);
  }

  async editar(id: string, e: EdicionProducto): Promise<ProductoAdmin> {
    await this.db.transaction(async (tx) => {
      const actual = await bloquear(tx, id);
      const cambios: Partial<typeof productos.$inferInsert> = {};
      if (e.nombre !== undefined) cambios.nombre = e.nombre; // el slug no cambia: no rompe enlaces ni SEO
      if (e.marca !== undefined) cambios.marcaId = await idMarca(tx, e.marca);
      if (e.medida !== undefined) cambios.medida = await medidaExistente(tx, e.medida);
      if (e.amperajeAh !== undefined) cambios.amperajeAh = e.amperajeAh;
      if (e.cca !== undefined) cambios.cca = e.cca;
      if (e.gama !== undefined) cambios.gama = e.gama;
      if (e.descripcion !== undefined) cambios.descripcion = e.descripcion;
      if (e.precioLista !== undefined) cambios.precioLista = BigInt(e.precioLista);
      // Valor absoluto: es el conteo que hizo el admin en el local.
      if (e.stock !== undefined) cambios.stock = e.stock;
      if (e.garantiaMeses !== undefined) cambios.garantiaMeses = e.garantiaMeses;
      if (e.estado !== undefined) cambios.estado = e.estado;

      const estadoFinal = cambios.estado ?? actual.estado;
      if (estadoFinal === 'activo') {
        const fotos = await this.fotos.deProducto(id, tx);
        const falta = faltaParaActivar(cambios.precioLista ?? actual.precioLista, fotos.length);
        if (falta.length > 0) {
          throw new ErrorDeDominio(
            'regla_de_negocio',
            'NO_SE_PUEDE_ACTIVAR',
            `${falta.join(' y ')} para publicarlo`,
          );
        }
      }
      await tx.update(productos).set(cambios).where(eq(productos.id, id));
      if (estadoFinal === 'activo' || actual.estado === 'activo') {
        await this.outbox.revalidar(tx, ['catalogo', `producto:${actual.slug}`]);
      }
    });
    return this.obtener(id);
  }

  /** Sin pedidos se borra; con pedidos se archiva para que los pedidos viejos lo conserven (FR-071). */
  async eliminar(id: string): Promise<{ resultado: 'eliminado' | 'archivado' }> {
    const { resultado, claves } = await this.db.transaction((tx) => this.eliminarEnTx(tx, id));
    await this.fotos.borrarArchivos(claves);
    return { resultado };
  }

  /**
   * Revisión en lote de lo importado (FR-070). "Habilitar" publica lo que está completo; lo que
   * no tiene precio o foto queda pausado y el informe dice qué falta.
   */
  async revisar(r: RevisionProductos): Promise<ResultadoRevision> {
    const resultados: ResultadoRevision['resultados'] = [];
    const archivosABorrar: string[] = [];
    for (const id of r.ids) {
      try {
        if (r.accion === 'eliminar') {
          const { resultado, claves } = await this.db.transaction((tx) =>
            this.eliminarEnTx(tx, id),
          );
          archivosABorrar.push(...claves);
          resultados.push({ id, resultado, motivo: null });
        } else {
          resultados.push({ id, ...(await this.habilitar(id)) });
        }
      } catch (error) {
        if (!(error instanceof ErrorDeDominio) || error.tipo !== 'no_encontrado') throw error;
        resultados.push({ id, resultado: 'no_encontrado', motivo: null });
      }
    }
    await this.fotos.borrarArchivos(archivosABorrar);
    return { resultados };
  }

  async contarARevisar(): Promise<number> {
    const [fila] = await this.db
      .select({ n: count() })
      .from(productos)
      .where(eq(productos.estado, 'a_revisar'));
    return fila?.n ?? 0;
  }

  private async habilitar(
    id: string,
  ): Promise<{ resultado: 'activo' | 'pausado'; motivo: string | null }> {
    return this.db.transaction(async (tx) => {
      const actual = await bloquear(tx, id);
      const fotos = await this.fotos.deProducto(id, tx);
      const falta = faltaParaActivar(actual.precioLista, fotos.length);
      const estado = falta.length === 0 ? 'activo' : 'pausado';
      await tx.update(productos).set({ estado }).where(eq(productos.id, id));
      if (estado === 'activo')
        await this.outbox.revalidar(tx, ['catalogo', `producto:${actual.slug}`]);
      return { resultado: estado, motivo: falta.length ? falta.join(' y ') : null };
    });
  }

  private async eliminarEnTx(tx: Transaccion, id: string) {
    const actual = await bloquear(tx, id);
    const [usado] = await tx
      .select({ id: pedidoItems.id })
      .from(pedidoItems)
      .where(eq(pedidoItems.productoId, id))
      .limit(1);
    if (actual.estado === 'activo')
      await this.outbox.revalidar(tx, ['catalogo', `producto:${actual.slug}`]);
    if (usado) {
      await tx.update(productos).set({ estado: 'archivado' }).where(eq(productos.id, id));
      return { resultado: 'archivado' as const, claves: [] };
    }
    const claves = await this.fotos.claves(id, tx);
    await tx.delete(productos).where(eq(productos.id, id)); // las filas de fotos caen en cascada
    return { resultado: 'eliminado' as const, claves };
  }

  private aProducto(p: FilaAdmin, fotos: ProductoAdmin['fotos']): ProductoAdmin {
    return {
      id: p.id,
      sku: p.sku,
      slug: p.slug,
      nombre: p.nombre,
      marca: { nombre: p.marcaNombre, slug: p.marcaSlug },
      medida: p.medida,
      gama: p.gama,
      amperajeAh: p.amperajeAh,
      cca: p.cca,
      descripcion: p.descripcion,
      precioLista: Number(p.precioLista),
      stock: p.stock,
      garantiaMeses: p.garantiaMeses,
      estado: p.estado === 'archivado' ? 'pausado' : p.estado,
      fuente: p.fuente,
      fotos,
      faltaParaActivar: faltaParaActivar(p.precioLista, fotos.length),
      actualizadoEn: p.actualizadoEn.toISOString(),
    };
  }
}

type FilaAdmin = {
  id: string;
  sku: string;
  slug: string;
  nombre: string;
  marcaNombre: string;
  marcaSlug: string;
  medida: string;
  gama: 'economica' | 'reforzada';
  amperajeAh: number;
  cca: number | null;
  descripcion: string;
  precioLista: bigint;
  stock: number;
  garantiaMeses: number;
  estado: EstadoProducto;
  fuente: string;
  actualizadoEn: Date;
};

async function bloquear(tx: Transaccion, id: string) {
  const [p] = await tx
    .select({ slug: productos.slug, estado: productos.estado, precioLista: productos.precioLista })
    .from(productos)
    .where(and(eq(productos.id, id), ne(productos.estado, 'archivado')))
    .for('update');
  if (!p) throw noEncontrado('No encontramos ese producto');
  return p;
}

/** Acepta el nombre ("Sermat") o el slug ("sermat"). Lo usa también la importación. */
export async function idMarca(ej: Ejecutor, marca: string): Promise<string> {
  const [m] = await ej
    .select({ id: marcas.id })
    .from(marcas)
    .where(
      or(eq(marcas.slug, aSlug(marca)), sql`lower(${marcas.nombre}) = lower(${marca.trim()})`),
    );
  if (!m) throw validacion({ marca: 'Elegí una de las marcas: Sermat, Herbo, Volta o Edna' });
  return m.id;
}

export async function medidaExistente(ej: Ejecutor, codigo: string): Promise<string> {
  const normal = codigo.trim().toLowerCase();
  const [m] = await ej
    .select({ codigo: medidas.codigo })
    .from(medidas)
    .where(eq(medidas.codigo, normal));
  if (!m) throw validacion({ medida: `La medida ${codigo} no existe. Elegí una de la lista` });
  return m.codigo;
}

/** "Sermat 12x65" → "sermat-12x65"; si ya existe, "sermat-12x65-2", "-3"… */
export async function slugUnico(ej: Ejecutor, nombre: string): Promise<string> {
  const base = aSlug(nombre) || 'producto';
  const usados = new Set(
    (
      await ej
        .select({ slug: productos.slug })
        .from(productos)
        .where(or(eq(productos.slug, base), ilike(productos.slug, `${base}-%`)))
    ).map((p) => p.slug),
  );
  if (!usados.has(base)) return base;
  for (let i = 2; ; i++) if (!usados.has(`${base}-${i}`)) return `${base}-${i}`;
}
