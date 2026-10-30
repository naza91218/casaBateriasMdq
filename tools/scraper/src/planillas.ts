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
 * Compatibilidad en borrador: las fuentes dan el modelo pero no los años. Juan completa
 * `anio_desde` y `anio_hasta` (y corrige la marca si hace falta) antes de importarla.
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
];

function celda(valor: string): string {
  return /[",\r\n]/.test(valor) ? `"${valor.replaceAll('"', '""')}"` : valor;
}

/** CSV UTF-8 separado por comas, con BOM para que Excel muestre bien las tildes. */
export function aCsv<T extends object>(columnas: (keyof T)[], filas: T[]): string {
  const lineas = [columnas.join(','), ...filas.map((f) => columnas.map((c) => celda(String(f[c] ?? ''))).join(','))];
  return `${String.fromCharCode(0xfeff)}${lineas.join('\r\n')}\r\n`;
}

/** "12 V 80 Ah", "12V80AMP", "12-80", "12 80" → { volts: 12, ah: 80 }. */
export function voltsYAmperes(texto: string): { volts: number; ah: number } | null {
  const m = texto.match(/\b(6|12)\s*(?:v|volts?)?\s*[-x ]?\s*(\d{2,3})\s*(?:ah|amp|a\b)?/i);
  if (!m) return null;
  const ah = Number(m[2]);
  return ah >= 20 && ah <= 250 ? { volts: Number(m[1]), ah } : null;
}

export const medida = (volts: number, ah: number) => `${volts}x${ah}`;
