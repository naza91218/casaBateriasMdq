import { and, asc, eq, gte, isNotNull, isNull, lte, or } from 'drizzle-orm';
import type { Ejecutor } from '../../../platform/db.js';
import { vehiculoMedidas, vehiculos } from './schema.js';

export class RepositorioCompatibilidad {
  constructor(private readonly db: Ejecutor) {}

  /** Solo marcas con al menos un vehículo que tenga medida cargada (FR-010). */
  marcas() {
    return this.db
      .selectDistinct({ nombre: vehiculos.marca, slug: vehiculos.marcaSlug })
      .from(vehiculos)
      .innerJoin(vehiculoMedidas, eq(vehiculoMedidas.vehiculoId, vehiculos.id))
      .orderBy(asc(vehiculos.marca));
  }

  modelos(marcaSlug: string) {
    return this.db
      .selectDistinct({ nombre: vehiculos.modelo, slug: vehiculos.modeloSlug })
      .from(vehiculos)
      .innerJoin(vehiculoMedidas, eq(vehiculoMedidas.vehiculoId, vehiculos.id))
      .where(eq(vehiculos.marcaSlug, marcaSlug))
      .orderBy(asc(vehiculos.modelo));
  }

  rangos(marcaSlug: string, modeloSlug: string) {
    return this.db
      .selectDistinct({ desde: vehiculos.anioDesde, hasta: vehiculos.anioHasta })
      .from(vehiculos)
      .innerJoin(vehiculoMedidas, eq(vehiculoMedidas.vehiculoId, vehiculos.id))
      .where(and(eq(vehiculos.marcaSlug, marcaSlug), eq(vehiculos.modeloSlug, modeloSlug), isNotNull(vehiculos.anioDesde)));
  }

  /**
   * Vehículos del modelo que cubren ese año más los cargados sin años (valen para todos). Sin
   * año, solo los que no distinguen años.
   */
  vehiculosEnAnio(marcaSlug: string, modeloSlug: string, anio?: number) {
    return this.db
      .select({
        marca: vehiculos.marca,
        modelo: vehiculos.modelo,
        medida: vehiculoMedidas.medida,
      })
      .from(vehiculos)
      .innerJoin(vehiculoMedidas, eq(vehiculoMedidas.vehiculoId, vehiculos.id))
      .where(
        and(
          eq(vehiculos.marcaSlug, marcaSlug),
          eq(vehiculos.modeloSlug, modeloSlug),
          anio === undefined
            ? isNull(vehiculos.anioDesde)
            : or(isNull(vehiculos.anioDesde), and(lte(vehiculos.anioDesde, anio), gte(vehiculos.anioHasta, anio))),
        ),
      );
  }

  /** Autos que llevan una medida: los muestra la ficha de producto (FR-006). */
  vehiculosDeMedida(medida: string) {
    return this.db
      .selectDistinct({
        marca: vehiculos.marca,
        modelo: vehiculos.modelo,
        anioDesde: vehiculos.anioDesde,
        anioHasta: vehiculos.anioHasta,
      })
      .from(vehiculos)
      .innerJoin(vehiculoMedidas, eq(vehiculoMedidas.vehiculoId, vehiculos.id))
      .where(eq(vehiculoMedidas.medida, medida))
      .orderBy(asc(vehiculos.marca), asc(vehiculos.modelo), asc(vehiculos.anioDesde));
  }
}
