import { asc, eq } from 'drizzle-orm';
import type { Ejecutor } from '../../../platform/db.js';
import { Dinero } from '../../../shared-kernel/dinero.js';
import { zonasColocacion } from '../infrastructure/schema.js';

export interface Zona {
  id: string;
  nombre: string;
  costoExtra: Dinero;
}

/** Servicio del módulo entregas. La edición desde el panel se suma en T107. */
export class ServicioZonas {
  constructor(private readonly db: Ejecutor) {}

  async listarActivas(): Promise<Zona[]> {
    const filas = await this.db
      .select()
      .from(zonasColocacion)
      .where(eq(zonasColocacion.activa, true))
      .orderBy(asc(zonasColocacion.nombre));
    return filas.map((f) => ({ id: f.id, nombre: f.nombre, costoExtra: Dinero.deCentavos(f.costoExtra) }));
  }
}
