import type { DatosVehiculo, VehiculoAdmin } from '@casa/shared';
import { and, asc, count, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import type { BaseDeDatos, Ejecutor, Transaccion } from '../../../platform/db.js';
import { noEncontrado, validacion } from '../../../shared-kernel/errores.js';
import { slug } from '../../../shared-kernel/slug.js';
import { medidas } from '../../catalogo/infrastructure/schema.js';
import type { Outbox } from '../../notificaciones/application/outbox.js';
import { vehiculoMedidas, vehiculos } from '../infrastructure/schema.js';

const textoLike = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

export const etiquetaVehiculo = (marca: string, modelo: string) =>
  `vehiculo:${slug(marca)}/${slug(modelo)}`;

/** Clave natural de un vehículo: marca, modelo, rango de años y motor (contracts/importacion-csv.md). */
export interface ClaveVehiculo {
  marca: string;
  modelo: string;
  /** null = todos los años (clarify 2026-10-30). */
  anioDesde?: number | null | undefined;
  anioHasta?: number | null | undefined;
  motor?: string | null | undefined;
}

/**
 * Vehículos y sus medidas desde el panel (FR-048). Cada cambio regenera la página del auto y el
 * buscador.
 */
export class ServicioAdminVehiculos {
  constructor(
    private readonly db: BaseDeDatos,
    private readonly outbox: Outbox,
  ) {}

  async listar(f: {
    q?: string | undefined;
    medida?: string | undefined;
    pagina: number;
    porPagina: number;
  }) {
    const condiciones: SQL[] = [];
    if (f.medida)
      condiciones.push(
        inArray(
          vehiculos.id,
          this.db
            .select({ id: vehiculoMedidas.vehiculoId })
            .from(vehiculoMedidas)
            .where(eq(vehiculoMedidas.medida, f.medida)),
        ),
      );
    if (f.q) {
      for (const palabra of f.q.split(/\s+/).filter(Boolean)) {
        const coincide = or(
          ilike(vehiculos.marca, textoLike(palabra)),
          ilike(vehiculos.modelo, textoLike(palabra)),
        );
        if (coincide) condiciones.push(coincide);
      }
    }
    const donde = and(...condiciones);
    const [filas, [total]] = await Promise.all([
      this.db
        .select()
        .from(vehiculos)
        .where(donde)
        .orderBy(asc(vehiculos.marca), asc(vehiculos.modelo), asc(vehiculos.anioDesde))
        .limit(f.porPagina)
        .offset((f.pagina - 1) * f.porPagina),
      this.db.select({ n: count() }).from(vehiculos).where(donde),
    ]);
    const medidasPorId = await this.medidasDe(filas.map((v) => v.id));
    return {
      items: filas.map((v) => aVehiculo(v, medidasPorId.get(v.id) ?? [])),
      total: total?.n ?? 0,
      pagina: f.pagina,
      porPagina: f.porPagina,
    };
  }

  async obtener(id: string, ej: Ejecutor = this.db): Promise<VehiculoAdmin> {
    const [v] = await ej.select().from(vehiculos).where(eq(vehiculos.id, id));
    if (!v) throw noEncontrado('No encontramos ese auto');
    return aVehiculo(v, (await this.medidasDe([id], ej)).get(id) ?? []);
  }

  async crear(d: DatosVehiculo): Promise<VehiculoAdmin> {
    const id = await this.db.transaction(async (tx) => {
      if (await buscarPorClave(tx, d))
        throw validacion({ modelo: 'Ese auto con esos años y motor ya está cargado' });
      const { id } = await guardarVehiculo(tx, d, 'manual');
      await this.outbox.revalidar(tx, ['buscador', etiquetaVehiculo(d.marca, d.modelo)]);
      return id;
    });
    return this.obtener(id);
  }

  async editar(id: string, d: DatosVehiculo): Promise<VehiculoAdmin> {
    await this.db.transaction(async (tx) => {
      const [actual] = await tx.select().from(vehiculos).where(eq(vehiculos.id, id)).for('update');
      if (!actual) throw noEncontrado('No encontramos ese auto');
      const otro = await buscarPorClave(tx, d);
      if (otro && otro !== id)
        throw validacion({ modelo: 'Ese auto con esos años y motor ya está cargado' });
      await tx
        .update(vehiculos)
        .set({ ...camposVehiculo(d) })
        .where(eq(vehiculos.id, id));
      await reemplazarMedidas(tx, id, d.medidas);
      await this.outbox.revalidar(tx, [
        'buscador',
        etiquetaVehiculo(actual.marca, actual.modelo),
        etiquetaVehiculo(d.marca, d.modelo),
      ]);
    });
    return this.obtener(id);
  }

  async borrar(id: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [v] = await tx.delete(vehiculos).where(eq(vehiculos.id, id)).returning();
      if (!v) throw noEncontrado('No encontramos ese auto');
      await this.outbox.revalidar(tx, ['buscador', etiquetaVehiculo(v.marca, v.modelo)]);
    });
  }

  private async medidasDe(ids: string[], ej: Ejecutor = this.db): Promise<Map<string, string[]>> {
    const resultado = new Map<string, string[]>();
    if (ids.length === 0) return resultado;
    const filas = await ej
      .select({ vehiculoId: vehiculoMedidas.vehiculoId, medida: vehiculoMedidas.medida })
      .from(vehiculoMedidas)
      .innerJoin(medidas, eq(medidas.codigo, vehiculoMedidas.medida))
      .where(inArray(vehiculoMedidas.vehiculoId, ids))
      .orderBy(asc(medidas.orden));
    for (const f of filas)
      resultado.set(f.vehiculoId, [...(resultado.get(f.vehiculoId) ?? []), f.medida]);
    return resultado;
  }
}

function aVehiculo(v: typeof vehiculos.$inferSelect, listaMedidas: string[]): VehiculoAdmin {
  return {
    id: v.id,
    marca: v.marca,
    modelo: v.modelo,
    anioDesde: v.anioDesde,
    anioHasta: v.anioHasta,
    motor: v.motor,
    medidas: listaMedidas,
    fuente: v.fuente,
  };
}

function camposVehiculo(d: ClaveVehiculo) {
  return {
    marca: d.marca.trim(),
    marcaSlug: slug(d.marca),
    modelo: d.modelo.trim(),
    modeloSlug: slug(d.modelo),
    anioDesde: d.anioDesde ?? null,
    anioHasta: d.anioHasta ?? null,
    motor: d.motor?.trim() || null,
  };
}

/** Mismo criterio que el índice único `vehiculos_unico`. */
export async function buscarPorClave(ej: Ejecutor, c: ClaveVehiculo): Promise<string | null> {
  const [v] = await ej
    .select({ id: vehiculos.id })
    .from(vehiculos)
    .where(
      and(
        eq(vehiculos.marcaSlug, slug(c.marca)),
        eq(vehiculos.modeloSlug, slug(c.modelo)),
        sql`coalesce(${vehiculos.anioDesde}, 0) = ${c.anioDesde ?? 0}`,
        sql`coalesce(${vehiculos.anioHasta}, 0) = ${c.anioHasta ?? 0}`,
        sql`coalesce(${vehiculos.motor}, '') = ${c.motor?.trim() || ''}`,
      ),
    );
  return v?.id ?? null;
}

/**
 * Crea o actualiza por clave natural y reemplaza sus medidas. Lo usan el panel y la importación
 * de compatibilidades.
 */
export async function guardarVehiculo(
  tx: Transaccion,
  d: ClaveVehiculo & { medidas: string[] },
  fuente: string,
): Promise<{ id: string; creado: boolean }> {
  await exigirMedidas(tx, d.medidas);
  const existente = await buscarPorClave(tx, d);
  let id = existente;
  if (existente) {
    await tx
      .update(vehiculos)
      .set({ ...camposVehiculo(d), fuente })
      .where(eq(vehiculos.id, existente));
  } else {
    const [v] = await tx
      .insert(vehiculos)
      .values({ ...camposVehiculo(d), fuente })
      .returning({ id: vehiculos.id });
    id = v?.id ?? null;
  }
  if (!id) throw new Error('No se guardó el vehículo');
  await reemplazarMedidas(tx, id, d.medidas);
  return { id, creado: !existente };
}

async function exigirMedidas(ej: Ejecutor, lista: string[]): Promise<void> {
  const existentes = new Set(
    (
      await ej
        .select({ codigo: medidas.codigo })
        .from(medidas)
        .where(inArray(medidas.codigo, lista))
    ).map((m) => m.codigo),
  );
  const faltan = lista.filter((m) => !existentes.has(m));
  if (faltan.length) throw validacion({ medidas: `No existe la medida ${faltan.join(', ')}` });
}

async function reemplazarMedidas(
  tx: Transaccion,
  vehiculoId: string,
  lista: string[],
): Promise<void> {
  await exigirMedidas(tx, lista);
  await tx.delete(vehiculoMedidas).where(eq(vehiculoMedidas.vehiculoId, vehiculoId));
  await tx
    .insert(vehiculoMedidas)
    .values([...new Set(lista)].map((medida) => ({ vehiculoId, medida })));
}
