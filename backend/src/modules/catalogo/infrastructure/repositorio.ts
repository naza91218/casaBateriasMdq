import { and, asc, count, desc, eq, gt, inArray, type SQL } from 'drizzle-orm';
import type { Ejecutor } from '../../../platform/db.js';
import type { Gama } from '../domain/precios.js';
import { marcas, medidas, productoFotos, productos } from './schema.js';

export interface FiltrosListado {
  marca?: string | undefined; // slug
  medida?: string | undefined;
  gama?: Gama | undefined;
  orden?: 'relevantes' | 'precio-asc' | 'precio-desc' | 'amperaje' | 'nombre' | undefined;
  pagina: number;
  porPagina: number;
}

const columnasProducto = {
  id: productos.id,
  slug: productos.slug,
  nombre: productos.nombre,
  medida: productos.medida,
  gama: productos.gama,
  amperajeAh: productos.amperajeAh,
  cca: productos.cca,
  descripcion: productos.descripcion,
  precioLista: productos.precioLista,
  stock: productos.stock,
  garantiaMeses: productos.garantiaMeses,
  marcaNombre: marcas.nombre,
  marcaSlug: marcas.slug,
};

export type FilaProducto = {
  id: string;
  slug: string;
  nombre: string;
  medida: string;
  gama: Gama;
  amperajeAh: number;
  cca: number | null;
  descripcion: string;
  precioLista: bigint;
  stock: number;
  garantiaMeses: number;
  marcaNombre: string;
  marcaSlug: string;
};

export class RepositorioCatalogo {
  constructor(private readonly db: Ejecutor) {}

  marcasActivas() {
    return this.db
      .select({ nombre: marcas.nombre, slug: marcas.slug })
      .from(marcas)
      .where(eq(marcas.activa, true))
      .orderBy(asc(marcas.nombre));
  }

  medidas() {
    return this.db.select({ codigo: medidas.codigo }).from(medidas).orderBy(asc(medidas.orden));
  }

  /** Solo productos activos: los pausados, a revisar y archivados no se ven (FR-008, FR-070). */
  async listarActivos(f: FiltrosListado): Promise<{ filas: FilaProducto[]; total: number }> {
    const condiciones: SQL[] = [eq(productos.estado, 'activo')];
    if (f.marca) condiciones.push(eq(marcas.slug, f.marca));
    if (f.medida) condiciones.push(eq(productos.medida, f.medida));
    if (f.gama) condiciones.push(eq(productos.gama, f.gama));
    const donde = and(...condiciones);
    // El nombre desempata siempre, así la paginación no repite ni saltea productos.
    const orden = {
      relevantes: [asc(medidas.orden), asc(productos.gama), asc(productos.nombre)],
      'precio-asc': [asc(productos.precioLista), asc(productos.nombre)],
      'precio-desc': [desc(productos.precioLista), asc(productos.nombre)],
      amperaje: [desc(productos.amperajeAh), asc(productos.precioLista), asc(productos.nombre)],
      nombre: [asc(productos.nombre)],
    }[f.orden ?? 'relevantes'];

    const [filas, [totalFila]] = await Promise.all([
      this.db
        .select(columnasProducto)
        .from(productos)
        .innerJoin(marcas, eq(marcas.id, productos.marcaId))
        .innerJoin(medidas, eq(medidas.codigo, productos.medida))
        .where(donde)
        .orderBy(...orden)
        .limit(f.porPagina)
        .offset((f.pagina - 1) * f.porPagina),
      this.db
        .select({ total: count() })
        .from(productos)
        .innerJoin(marcas, eq(marcas.id, productos.marcaId))
        .where(donde),
    ]);
    return { filas, total: totalFila?.total ?? 0 };
  }

  async activoPorSlug(slug: string): Promise<FilaProducto | null> {
    const [fila] = await this.db
      .select(columnasProducto)
      .from(productos)
      .innerJoin(marcas, eq(marcas.id, productos.marcaId))
      .where(and(eq(productos.slug, slug), eq(productos.estado, 'activo')));
    return fila ?? null;
  }

  /** Activos con stock de cualquiera de las medidas (resultado del buscador, FR-011). */
  activosConStockDeMedidas(listaMedidas: string[]): Promise<FilaProducto[]> {
    if (listaMedidas.length === 0) return Promise.resolve([]);
    return this.db
      .select(columnasProducto)
      .from(productos)
      .innerJoin(marcas, eq(marcas.id, productos.marcaId))
      .innerJoin(medidas, eq(medidas.codigo, productos.medida))
      .where(
        and(
          eq(productos.estado, 'activo'),
          gt(productos.stock, 0),
          inArray(productos.medida, listaMedidas),
        ),
      )
      .orderBy(asc(medidas.orden), asc(productos.precioLista), asc(productos.nombre));
  }

  /** Productos que se pueden indexar: solo los activos (FR-055, US6-04). */
  activosParaIndice() {
    return this.db
      .select({
        slug: productos.slug,
        nombre: productos.nombre,
        actualizadoEn: productos.actualizadoEn,
      })
      .from(productos)
      .where(eq(productos.estado, 'activo'))
      .orderBy(asc(productos.nombre));
  }

  /** Claves de fotos en orden, agrupadas por producto. */
  async fotosDe(ids: string[]): Promise<Map<string, string[]>> {
    const resultado = new Map<string, string[]>();
    if (ids.length === 0) return resultado;
    const filas = await this.db
      .select({ productoId: productoFotos.productoId, clave: productoFotos.clave })
      .from(productoFotos)
      .where(inArray(productoFotos.productoId, ids))
      .orderBy(asc(productoFotos.productoId), asc(productoFotos.orden));
    for (const f of filas) {
      const lista = resultado.get(f.productoId) ?? [];
      lista.push(f.clave);
      resultado.set(f.productoId, lista);
    }
    return resultado;
  }
}
