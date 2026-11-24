/**
 * Filas con el formato exacto de contracts/importacion-csv.md. El scraper es una capa
 * anticorrupción: cada fuente traduce sus datos a estas filas y nada más.
 */
export interface FilaProducto {
  sku: string;
  marca: 'Sermat' | 'Herbo' | 'Volta' | 'Edna';
  nombre: string;
  medida: string; // "12x65"; vacío si no se pudo deducir (la importación lo marca como error)
  amperaje_ah: string;
  cca: string;
  gama: 'economica' | 'reforzada';
  descripcion: string;
  precio_lista: ''; // nunca se copian precios de terceros
  stock: '';
  fotos: string; // rutas relativas a data/import, separadas por |
  fuente: string;
}

/**
 * Compatibilidad con el formato de importación. Los años quedan vacíos (= todos los años, clarify
 * 2026-10-30) salvo que Mateo los complete. `texto_original` y `revisar` son para él: la
 * importación ignora esas columnas.
 */
export interface FilaCompatibilidad {
  marca_auto: string;
  modelo: string;
  anio_desde: string;
  anio_hasta: string;
  motor: string;
  medidas: string;
  fuente: string;
  texto_original: string;
  revisar: string;
}

export const COLUMNAS_PRODUCTOS: (keyof FilaProducto)[] = [
  'sku',
  'marca',
  'nombre',
  'medida',
  'amperaje_ah',
  'cca',
  'gama',
  'descripcion',
  'precio_lista',
  'stock',
  'fotos',
  'fuente',
];

export const COLUMNAS_COMPATIBILIDADES: (keyof FilaCompatibilidad)[] = [
  'marca_auto',
  'modelo',
  'anio_desde',
  'anio_hasta',
  'motor',
  'medidas',
  'fuente',
  'texto_original',
  'revisar',
];

function celda(valor: string): string {
  return /[",\r\n]/.test(valor) ? `"${valor.replaceAll('"', '""')}"` : valor;
}

/** CSV UTF-8 separado por comas, con BOM para que Excel muestre bien las tildes. */
export function aCsv<T extends object>(columnas: (keyof T)[], filas: T[]): string {
  const lineas = [
    columnas.join(','),
    ...filas.map((f) => columnas.map((c) => celda(String(f[c] ?? ''))).join(',')),
  ];
  return `${String.fromCharCode(0xfeff)}${lineas.join('\r\n')}\r\n`;
}

/** "12 V 80 Ah", "12V80AMP", "12-80", "12 80" → { volts: 12, ah: 80 }. */
export function voltsYAmperes(texto: string): { volts: number; ah: number } | null {
  const m = texto.match(/\b(6|12)\s*(?:v|volts?)?\s*[-x ]?\s*(\d{2,3})\s*(?:ah|amp|a\b)?/i);
  if (!m) return null;
  const ah = Number(m[2]);
  return ah >= 20 && ah <= 250 ? { volts: Number(m[1]), ah } : null;
}

/** Medidas que vienen en caja alta y caja baja: a cada auto le entra una sola (cliente, 2026-11-03). */
const CON_ALTURA = new Set([90, 110]);
/** Desde este alto de caja (mm) es "alta". Coincide con los catálogos de Sermat, Herbo y Edna. */
const ALTO_MINIMO_ALTA = 200;

/**
 * "12x65"; para 12x90 y 12x110, "12x90 alta" o "12x90 baja" según el alto de la caja en mm o la
 * altura ya conocida. Sin ese dato queda "12x90" y la importación lo rechaza para que se revise.
 */
export function medida(volts: number, ah: number, altura?: number | 'alta' | 'baja'): string {
  const base = `${volts}x${ah}`;
  if (!CON_ALTURA.has(ah) || altura === undefined) return base;
  const alta = typeof altura === 'number' ? altura >= ALTO_MINIMO_ALTA : altura === 'alta';
  return `${base} ${alta ? 'alta' : 'baja'}`;
}

/** El alto de "Medidas: 319 x 170 x 227 mm" (largo x ancho x alto). */
export function altoDe(dimensiones: string): number | undefined {
  const m = dimensiones.match(/\d+\s*x\s*\d+\s*x\s*(\d+)/);
  return m ? Number(m[1]) : undefined;
}
