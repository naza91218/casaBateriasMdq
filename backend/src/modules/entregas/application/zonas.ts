import { and, asc, eq, ne, sql } from 'drizzle-orm';
import type { Ejecutor } from '../../../platform/db.js';
import { Dinero } from '../../../shared-kernel/dinero.js';
import { noEncontrado, validacion } from '../../../shared-kernel/errores.js';
import { zonasColocacion } from '../infrastructure/schema.js';

export interface Zona {
  id: string;
  nombre: string;
  costoExtra: Dinero;
  activa: boolean;
}

const aZona = (f: typeof zonasColocacion.$inferSelect): Zona => ({
  id: f.id,
  nombre: f.nombre,
  costoExtra: Dinero.deCentavos(f.costoExtra),
  activa: f.activa,
});

export interface DatosZona {
  nombre: string;
  costoExtra: number; // centavos
  activa: boolean;
}

/** Zonas de colocación: las activas se ofrecen en el checkout; el panel las edita (FR-017, FR-047). */
export class ServicioZonas {
  constructor(private readonly db: Ejecutor) {}

  async listarActivas(): Promise<Zona[]> {
    const filas = await this.db
      .select()
      .from(zonasColocacion)
      .where(eq(zonasColocacion.activa, true))
      .orderBy(asc(zonasColocacion.nombre));
    return filas.map(aZona);
  }

  async obtener(id: string, ej: Ejecutor = this.db): Promise<Zona | null> {
    const [f] = await ej.select().from(zonasColocacion).where(eq(zonasColocacion.id, id));
    return f ? aZona(f) : null;
  }

  async obtenerActiva(id: string, ej: Ejecutor = this.db): Promise<Zona | null> {
    const [f] = await ej
      .select()
      .from(zonasColocacion)
      .where(and(eq(zonasColocacion.id, id), eq(zonasColocacion.activa, true)));
    return f ? aZona(f) : null;
  }

  async listarTodas(): Promise<Zona[]> {
    const filas = await this.db.select().from(zonasColocacion).orderBy(asc(zonasColocacion.nombre));
    return filas.map(aZona);
  }

  async crear(d: DatosZona): Promise<Zona> {
    await this.exigirNombreLibre(d.nombre);
    const [f] = await this.db
      .insert(zonasColocacion)
      .values({ nombre: d.nombre.trim(), costoExtra: BigInt(d.costoExtra), activa: d.activa })
      .returning();
    if (!f) throw new Error('No se creó la zona');
    return aZona(f);
  }

  /** Desactivar una zona no toca los pedidos que ya la usan: solo deja de ofrecerse. */
  async editar(id: string, d: Partial<DatosZona>): Promise<Zona> {
    if (d.nombre !== undefined) await this.exigirNombreLibre(d.nombre, id);
    const [f] = await this.db
      .update(zonasColocacion)
      .set({
        ...(d.nombre !== undefined ? { nombre: d.nombre.trim() } : {}),
        ...(d.costoExtra !== undefined ? { costoExtra: BigInt(d.costoExtra) } : {}),
        ...(d.activa !== undefined ? { activa: d.activa } : {}),
      })
      .where(eq(zonasColocacion.id, id))
      .returning();
    if (!f) throw noEncontrado('No encontramos esa zona');
    return aZona(f);
  }

  private async exigirNombreLibre(nombre: string, excepto?: string): Promise<void> {
    const [otra] = await this.db
      .select({ id: zonasColocacion.id })
      .from(zonasColocacion)
      .where(
        and(
          sql`lower(${zonasColocacion.nombre}) = lower(${nombre.trim()})`,
          excepto ? ne(zonasColocacion.id, excepto) : undefined,
        ),
      );
    if (otra) throw validacion({ nombre: 'Ya hay una zona con ese nombre' });
  }
}
