import { and, asc, eq } from 'drizzle-orm';
import type { Ejecutor } from '../../../platform/db.js';
import { Dinero } from '../../../shared-kernel/dinero.js';
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

/** Servicio del módulo entregas. La edición desde el panel se suma en T107. */
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
}
