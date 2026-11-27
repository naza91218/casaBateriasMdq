import { z } from 'zod';
import { normalizarMedida, PATRON_MEDIDA } from '../medidas.ts';
import { Importe, paginado, Whatsapp } from './comunes.ts';

/**
 * Contratos del panel de catálogo, importación, vehículos, configuración, zonas y canje (US5).
 * Los importes van en centavos, como en el resto de la API; las planillas usan pesos.
 */

const Gama = z.enum(['economica', 'reforzada']);
const medida = z
  .string()
  .trim()
  .transform(normalizarMedida)
  .pipe(z.string().regex(PATRON_MEDIDA, 'La medida tiene el formato 12x65 o 12x90 alta'));
const vacioONulo = <T extends z.ZodType>(t: T) =>
  z.preprocess((v) => (v === '' ? null : v), t.nullable());

// ── Productos ────────────────────────────────────────────────────────────────

export const EstadoProductoAdmin = z.enum(['a_revisar', 'activo', 'pausado']);

export const FotoAdmin = z.object({
  id: z.string(),
  url: z.string(),
  orden: z.number().int(),
  origen: z.enum(['marca', 'propia']),
});

export const ProductoAdmin = z.object({
  id: z.string(),
  sku: z.string(),
  slug: z.string(),
  nombre: z.string(),
  marca: z.object({ nombre: z.string(), slug: z.string() }),
  medida: z.string(),
  gama: Gama,
  amperajeAh: z.number().int(),
  cca: z.number().int().nullable(),
  descripcion: z.string(),
  precioLista: Importe,
  stock: z.number().int(),
  garantiaMeses: z.number().int(),
  estado: EstadoProductoAdmin,
  fuente: z.string(),
  fotos: z.array(FotoAdmin),
  /** Lo que falta para poder publicarlo (precio, foto). Vacío = se puede activar. */
  faltaParaActivar: z.array(z.string()),
  actualizadoEn: z.string(),
});
export type ProductoAdmin = z.infer<typeof ProductoAdmin>;

export const FiltroProductosAdmin = z.object({
  q: z.string().trim().max(100).optional(),
  estado: EstadoProductoAdmin.optional(),
  marca: z.string().trim().max(50).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(30),
});
export type FiltroProductosAdmin = z.infer<typeof FiltroProductosAdmin>;

export const ListaProductosAdmin = paginado(ProductoAdmin);
export type ListaProductosAdmin = z.infer<typeof ListaProductosAdmin>;

export const NuevoProducto = z.object({
  sku: z.string().trim().min(1, 'Escribí el código').max(60),
  nombre: z.string().trim().min(3, 'Escribí el nombre').max(150),
  marca: z.string().trim().min(1, 'Elegí la marca'),
  medida,
  amperajeAh: z.number().int().positive('El amperaje tiene que ser mayor a 0'),
  cca: z.number().int().positive().nullable().optional(),
  gama: Gama,
  descripcion: z.string().trim().max(3000).optional(),
  precioLista: Importe.optional(),
  stock: z.number().int().min(0, 'El stock no puede ser negativo').optional(),
  /** Si no viene, se calcula: 18 meses las Sermat de 12x45 a 12x75, 12 el resto. */
  garantiaMeses: z
    .number()
    .int('La garantía va en meses enteros')
    .min(1, 'La garantía tiene que ser de al menos 1 mes')
    .max(60, 'La garantía no puede pasar de 60 meses')
    .optional(),
});
export type NuevoProducto = z.infer<typeof NuevoProducto>;

export const EdicionProducto = NuevoProducto.omit({ sku: true })
  .partial()
  .extend({ estado: z.enum(['activo', 'pausado']).optional() })
  .refine((e) => Object.keys(e).length > 0, 'No hay cambios para guardar');
export type EdicionProducto = z.infer<typeof EdicionProducto>;

export const RevisionProductos = z.object({
  ids: z.array(z.string().uuid()).min(1, 'Elegí al menos un producto').max(500),
  accion: z.enum(['habilitar', 'eliminar']),
});
export type RevisionProductos = z.infer<typeof RevisionProductos>;

export const ResultadoRevision = z.object({
  resultados: z.array(
    z.object({
      id: z.string(),
      resultado: z.enum(['activo', 'pausado', 'eliminado', 'archivado', 'no_encontrado']),
      /** Por qué quedó pausado en vez de activo, por ejemplo "Falta el precio". */
      motivo: z.string().nullable(),
    }),
  ),
});
export type ResultadoRevision = z.infer<typeof ResultadoRevision>;

export const ResultadoEliminacion = z.object({ resultado: z.enum(['eliminado', 'archivado']) });

export const OrdenFotos = z.object({ ids: z.array(z.string().uuid()).min(1) });

// ── Importación ──────────────────────────────────────────────────────────────

export const TipoImportacion = z.enum(['productos', 'compatibilidades']);
export type TipoImportacion = z.infer<typeof TipoImportacion>;

export const InformeImportacion = z.object({
  importacionId: z.string(),
  filasTotal: z.number().int(),
  filasOk: z.number().int(),
  filasError: z.number().int(),
  creados: z.number().int(),
  actualizados: z.number().int(),
  /** `fila` cuenta desde 2: la 1 son los encabezados. */
  errores: z.array(z.object({ fila: z.number().int(), campo: z.string(), motivo: z.string() })),
});
export type InformeImportacion = z.infer<typeof InformeImportacion>;

// ── Vehículos ────────────────────────────────────────────────────────────────

export const VehiculoAdmin = z.object({
  id: z.string(),
  marca: z.string(),
  modelo: z.string(),
  anioDesde: z.number().int().nullable(),
  anioHasta: z.number().int().nullable(),
  motor: z.string().nullable(),
  medidas: z.array(z.string()),
  fuente: z.string(),
});
export type VehiculoAdmin = z.infer<typeof VehiculoAdmin>;

export const FiltroVehiculosAdmin = z.object({
  q: z.string().trim().max(100).optional(),
  /** Solo los autos de esta marca (exacta, sin distinguir mayúsculas). */
  marca: z.string().trim().max(60).optional(),
  /** Solo los autos que llevan esta medida (la lista «Le sirve a estos autos» del producto). */
  medida: z.string().trim().max(40).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(50),
});

export const ListaVehiculosAdmin = paginado(VehiculoAdmin);

const anio = z.number().int().min(1950, 'El año tiene que ser 1950 o posterior').max(2100);

export const DatosVehiculo = z
  .object({
    marca: z.string().trim().min(2, 'Escribí la marca del auto').max(60),
    modelo: z.string().trim().min(1, 'Escribí el modelo').max(80),
    // Sin años = vale para todos los años del modelo (clarify 2026-10-30).
    anioDesde: anio.nullable().optional(),
    anioHasta: anio.nullable().optional(),
    motor: vacioONulo(z.string().trim().max(60)).optional(),
    medidas: z.array(medida).min(1, 'Elegí al menos una medida'),
  })
  .refine((v) => (v.anioDesde == null) === (v.anioHasta == null), {
    path: ['anioHasta'],
    message: 'Cargá los dos años o ninguno',
  })
  .refine((v) => v.anioDesde == null || v.anioHasta == null || v.anioHasta >= v.anioDesde, {
    path: ['anioHasta'],
    message: 'El año hasta no puede ser menor que el desde',
  });
export type DatosVehiculo = z.infer<typeof DatosVehiculo>;

// ── Configuración y zonas ────────────────────────────────────────────────────

const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'La hora va como 08:30');
const vacioO = <T extends z.ZodString>(t: T) => z.union([z.literal(''), t]);

export const ConfiguracionAdmin = z.object({
  descuentoPct: z.number().min(0, 'El descuento va de 0 a 50').max(50, 'El descuento va de 0 a 50'),
  banco: z.object({
    titular: z.string().trim().max(120),
    cbu: vacioO(z.string().regex(/^\d{22}$/, 'El CBU tiene 22 números')),
    alias: vacioO(
      z
        .string()
        .regex(
          /^[a-zA-Z0-9.-]{6,20}$/,
          'El alias tiene entre 6 y 20 letras, números, puntos o guiones',
        ),
    ),
    cuit: vacioO(
      z.string().regex(/^\d{2}-?\d{8}-?\d$/, 'El CUIT tiene 11 números, por ejemplo 20-12345678-3'),
    ),
  }),
  whatsapp: vacioO(
    z.string().regex(/^\d{10,15}$/, 'Escribí el WhatsApp solo con números, con 549 adelante'),
  ),
  horarios: z
    .array(z.object({ dias: z.string().trim().min(3).max(60), desde: hora, hasta: hora }))
    .max(10),
  comercio: z.object({
    razonSocial: z.string().trim().max(150),
    cuit: vacioO(z.string().regex(/^\d{2}-?\d{8}-?\d$/, 'El CUIT tiene 11 números')),
    domicilio: z.string().trim().max(200),
    telefono: z.string().trim().max(30),
    lat: z.number().min(-90).max(90).nullable(),
    lng: z.number().min(-180).max(180).nullable(),
  }),
  googleResenasUrl: vacioO(z.string().url('Pegá el enlace completo de las reseñas de Google')),
});
export type ConfiguracionAdmin = z.infer<typeof ConfiguracionAdmin>;

export const EdicionConfiguracion = z
  .object({
    descuentoPct: ConfiguracionAdmin.shape.descuentoPct,
    banco: ConfiguracionAdmin.shape.banco.partial(),
    whatsapp: ConfiguracionAdmin.shape.whatsapp,
    horarios: ConfiguracionAdmin.shape.horarios,
    comercio: ConfiguracionAdmin.shape.comercio.partial(),
    googleResenasUrl: ConfiguracionAdmin.shape.googleResenasUrl,
  })
  .partial()
  .refine((e) => Object.keys(e).length > 0, 'No hay cambios para guardar');
export type EdicionConfiguracion = z.infer<typeof EdicionConfiguracion>;

export const ZonaAdmin = z.object({
  id: z.string(),
  nombre: z.string(),
  costoExtra: Importe,
  activa: z.boolean(),
});
export type ZonaAdmin = z.infer<typeof ZonaAdmin>;

export const DatosZona = z.object({
  nombre: z.string().trim().min(2, 'Escribí el nombre de la zona').max(80),
  costoExtra: Importe,
  activa: z.boolean().default(true),
});

export const EdicionZona = z
  .object({ nombre: DatosZona.shape.nombre, costoExtra: Importe, activa: z.boolean() })
  .partial()
  .refine((e) => Object.keys(e).length > 0, 'No hay cambios para guardar');

// ── Consultas de canje ───────────────────────────────────────────────────────

export const EstadoConsultaCanje = z.enum(['pendiente', 'atendida']);

export const ConsultaCanjeAdmin = z.object({
  id: z.string(),
  nombre: z.string(),
  telefono: z.string(),
  bateriaUsada: z.string().nullable(),
  auto: z.string(),
  localidad: z.string(),
  producto: z.string().nullable(),
  estado: EstadoConsultaCanje,
  creadoEn: z.string(),
  whatsapp: Whatsapp,
});
export type ConsultaCanjeAdmin = z.infer<typeof ConsultaCanjeAdmin>;

export const FiltroConsultasCanje = z.object({
  estado: EstadoConsultaCanje.optional(),
  formato: z.enum(['json', 'csv']).default('json'),
});

export const EdicionConsultaCanje = z.object({ estado: EstadoConsultaCanje });
