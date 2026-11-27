import { z } from 'zod';
import { Gama, ItemProducto } from './catalogo.ts';
import { Whatsapp } from './comunes.ts';

export const OpcionVehiculo = z.object({ nombre: z.string(), slug: z.string() });
export type OpcionVehiculo = z.infer<typeof OpcionVehiculo>;

const slugValido = z
  .string()
  .min(1)
  .regex(/^[a-z0-9-]+$/, 'Elegí una opción de la lista');

export const ConsultaModelos = z.object({ marca: slugValido });
export const ConsultaAnios = z.object({ marca: slugValido, modelo: slugValido });
/** `anio` va solo si el modelo distingue años (si `/vehiculos/anios` devolvió alguno, FR-010). */
export const ConsultaCompatibles = ConsultaAnios.extend({
  anio: z.coerce
    .number()
    .int()
    .min(1950, 'Elegí un año de la lista')
    .max(2100, 'Elegí un año de la lista')
    .optional(),
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

export const ParamsPaginaVehiculo = z.object({ marcaSlug: slugValido, modeloSlug: slugValido });

/**
 * Página de un modelo de auto (FR-053, FR-072): la respuesta directa a "¿qué batería lleva?",
 * la tabla de medidas por años y motor, las baterías disponibles y las preguntas frecuentes,
 * todo armado con los datos cargados para que se lea sin ejecutar scripts.
 */
export const PaginaVehiculo = z.object({
  marca: OpcionVehiculo,
  modelo: OpcionVehiculo,
  /** "El Volkswagen Gol Trend lleva una batería 12x65." Va arriba de todo. */
  respuesta: z.string(),
  medidas: z.array(z.string()),
  tabla: z.array(
    z.object({
      /** null = todos los años (clarify 2026-10-30). */
      anioDesde: z.number().int().nullable(),
      anioHasta: z.number().int().nullable(),
      /** null = cualquier motor. */
      motor: z.string().nullable(),
      medidas: z.array(z.string()),
    }),
  ),
  grupos: z.array(z.object({ gama: Gama, productos: z.array(ItemProducto) })),
  /** La primera responde la medida (US6-07). Van como datos estructurados FAQPage. */
  preguntas: z.array(z.object({ pregunta: z.string(), respuesta: z.string() })),
  actualizadoEn: z.string(),
  whatsapp: Whatsapp,
});
export type PaginaVehiculo = z.infer<typeof PaginaVehiculo>;

/** Para el mapa del sitio y `llms.txt` (FR-055, FR-074): solo lo que se puede indexar. */
export const IndiceSeo = z.object({
  productos: z.array(z.object({ slug: z.string(), nombre: z.string(), actualizadoEn: z.string() })),
  modelos: z.array(
    z.object({
      marca: OpcionVehiculo,
      modelo: OpcionVehiculo,
      actualizadoEn: z.string(),
    }),
  ),
});
export type IndiceSeo = z.infer<typeof IndiceSeo>;
