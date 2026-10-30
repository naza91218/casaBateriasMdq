import { z } from 'zod';
import { Gama, ItemProducto } from './catalogo.js';
import { Whatsapp } from './comunes.js';

export const OpcionVehiculo = z.object({ nombre: z.string(), slug: z.string() });
export type OpcionVehiculo = z.infer<typeof OpcionVehiculo>;

const slugValido = z.string().min(1).regex(/^[a-z0-9-]+$/, 'Elegí una opción de la lista');

export const ConsultaModelos = z.object({ marca: slugValido });
export const ConsultaAnios = z.object({ marca: slugValido, modelo: slugValido });
/** `anio` va solo si el modelo distingue años (si `/vehiculos/anios` devolvió alguno, FR-010). */
export const ConsultaCompatibles = ConsultaAnios.extend({
  anio: z.coerce.number().int().min(1950, 'Elegí un año de la lista').max(2100, 'Elegí un año de la lista').optional(),
});

export const ResultadoCompatibles = z.object({
  vehiculo: z.object({ marca: z.string(), modelo: z.string(), anio: z.number().int().nullable() }),
  medidas: z.array(z.string()),
  /** Agrupado por gama, económica primero (FR-011). */
  grupos: z.array(z.object({ gama: Gama, productos: z.array(ItemProducto) })),
  sinResultados: z.enum(['auto_no_cargado', 'sin_stock']).nullable(),
  /** Siempre presente: nunca un callejón sin salida (constitución III). */
  whatsapp: Whatsapp,
});
export type ResultadoCompatibles = z.infer<typeof ResultadoCompatibles>;
