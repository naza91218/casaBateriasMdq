import { eq } from 'drizzle-orm';
import type { BaseDeDatos } from '../../src/platform/db.js';
import { marcas, productos } from '../../src/modules/catalogo/infrastructure/schema.js';
import {
  vehiculoMedidas,
  vehiculos,
} from '../../src/modules/compatibilidad/infrastructure/schema.js';
import { slug } from '../../src/shared-kernel/slug.js';
import { garantiaPorDefecto } from '../../src/modules/catalogo/domain/precios.js';

/**
 * Datos de EJEMPLO para desarrollo y staging (escenarios de la spec). No son productos ni precios
 * reales: los reales salen de la importación (US5) y los revisa el administrador.
 */
const PRODUCTOS = [
  {
    marca: 'Sermat',
    nombre: 'Sermat 12x65 Reforzada',
    medida: '12x65',
    gama: 'reforzada',
    pesos: 100_000,
    stock: 5,
    estado: 'activo',
  },
  {
    marca: 'Herbo',
    nombre: 'Herbo 12x65 Reforzada',
    medida: '12x65',
    gama: 'reforzada',
    pesos: 130_000,
    stock: 3,
    estado: 'activo',
  },
  {
    marca: 'Volta',
    nombre: 'Volta 12x75 Económica',
    medida: '12x75',
    gama: 'economica',
    pesos: 110_000,
    stock: 0,
    estado: 'activo',
  },
  {
    marca: 'Edna',
    nombre: 'Edna 12x90 Reforzada',
    medida: '12x90 alta',
    gama: 'reforzada',
    pesos: 160_000,
    stock: 2,
    estado: 'pausado',
  },
] as const;

const VEHICULOS = [
  { marca: 'Volkswagen', modelo: 'Gol Trend', desde: 2008, hasta: 2023, medidas: ['12x65'] },
  { marca: 'Chevrolet', modelo: 'Corsa', desde: 2001, hasta: 2012, medidas: ['12x65'] },
  { marca: 'Toyota', modelo: 'Hilux', desde: 2016, hasta: 2024, medidas: ['12x90 alta'] },
];

export async function sembrarEjemplo(db: BaseDeDatos): Promise<void> {
  for (const p of PRODUCTOS) {
    const [marca] = await db
      .select({ id: marcas.id })
      .from(marcas)
      .where(eq(marcas.nombre, p.marca));
    if (!marca) throw new Error(`Falta la marca ${p.marca}: corré sembrarCatalogo antes`);
    await db
      .insert(productos)
      .values({
        sku: `EJEMPLO-${slug(p.nombre)}`,
        slug: slug(p.nombre),
        nombre: p.nombre,
        marcaId: marca.id,
        medida: p.medida,
        amperajeAh: parseInt(p.medida.split('x')[1] ?? '', 10),
        gama: p.gama,
        precioLista: BigInt(p.pesos * 100),
        stock: p.stock,
        garantiaMeses: garantiaPorDefecto(p.marca, p.medida),
        estado: p.estado,
        fuente: 'ejemplo',
      })
      .onConflictDoNothing();
  }
  for (const v of VEHICULOS) {
    const [fila] = await db
      .insert(vehiculos)
      .values({
        marca: v.marca,
        marcaSlug: slug(v.marca),
        modelo: v.modelo,
        modeloSlug: slug(v.modelo),
        anioDesde: v.desde,
        anioHasta: v.hasta,
        fuente: 'ejemplo',
      })
      .onConflictDoNothing()
      .returning({ id: vehiculos.id });
    if (fila) {
      await db
        .insert(vehiculoMedidas)
        .values(v.medidas.map((medida) => ({ vehiculoId: fila.id, medida })));
    }
  }
}
