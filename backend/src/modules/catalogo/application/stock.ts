import { and, eq, gte, inArray, sql } from 'drizzle-orm';
import type { Ejecutor, Transaccion } from '../../../platform/db.js';
import { Dinero } from '../../../shared-kernel/dinero.js';
import { ErrorDeDominio } from '../../../shared-kernel/errores.js';
import { productos } from '../infrastructure/schema.js';

export interface LineaStock {
  productoId: string;
  cantidad: number;
}

export interface ProductoReservado extends LineaStock {
  nombre: string;
  precioLista: Dinero;
}

/** Junta líneas repetidas y las ordena por id (orden fijo = sin bloqueos cruzados). */
function normalizar(lineas: LineaStock[]): LineaStock[] {
  const total = new Map<string, number>();
  for (const l of lineas) total.set(l.productoId, (total.get(l.productoId) ?? 0) + l.cantidad);
  return [...total.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([productoId, cantidad]) => ({ productoId, cantidad }));
}

/**
 * Stock del catálogo. "No se vende lo que no hay" (constitución V): la reserva es un UPDATE
 * condicional dentro de la transacción del pedido; si una línea no alcanza, falla todo.
 */
export class ServicioStock {
  constructor(private readonly db: Ejecutor) {}

  async reservar(tx: Transaccion, lineas: LineaStock[]): Promise<ProductoReservado[]> {
    const reservados: ProductoReservado[] = [];
    for (const l of normalizar(lineas)) {
      const [fila] = await tx
        .update(productos)
        .set({ stock: sql`${productos.stock} - ${l.cantidad}` })
        .where(
          and(
            eq(productos.id, l.productoId),
            eq(productos.estado, 'activo'),
            gte(productos.stock, l.cantidad),
          ),
        )
        .returning({ nombre: productos.nombre, precioLista: productos.precioLista });
      if (!fila) {
        const [p] = await tx
          .select({ nombre: productos.nombre })
          .from(productos)
          .where(eq(productos.id, l.productoId));
        throw new ErrorDeDominio(
          'conflicto',
          'STOCK_INSUFICIENTE',
          p ? `Se agotó mientras comprabas: ${p.nombre}` : 'Ese producto ya no está disponible',
          undefined,
          { productoId: l.productoId },
        );
      }
      reservados.push({
        ...l,
        nombre: fila.nombre,
        precioLista: Dinero.deCentavos(fila.precioLista),
      });
    }
    return reservados;
  }

  async devolver(tx: Transaccion, lineas: LineaStock[]): Promise<void> {
    for (const l of normalizar(lineas)) {
      await tx
        .update(productos)
        .set({ stock: sql`${productos.stock} + ${l.cantidad}` })
        .where(eq(productos.id, l.productoId));
    }
  }

  /** Productos activos con su precio vigente, para cotizar sin reservar. */
  async vigentes(
    ids: string[],
  ): Promise<Map<string, { nombre: string; precioLista: Dinero; stock: number }>> {
    const filas = ids.length
      ? await this.db
          .select({
            id: productos.id,
            nombre: productos.nombre,
            precioLista: productos.precioLista,
            stock: productos.stock,
          })
          .from(productos)
          .where(and(inArray(productos.id, ids), eq(productos.estado, 'activo')))
      : [];
    return new Map(
      filas.map((f) => [
        f.id,
        { nombre: f.nombre, precioLista: Dinero.deCentavos(f.precioLista), stock: f.stock },
      ]),
    );
  }
}
