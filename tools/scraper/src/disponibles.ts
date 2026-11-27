import type { FilaProducto } from './planillas.js';

/**
 * Lo que el local tiene de verdad (lista del cliente, 2026-11-03). Las fuentes traen todo el
 * catálogo de cada marca; a la planilla pasa solo esto, con los ajustes que no salen de la
 * fuente. Lo que no está acá no se importa (y en una base ya cargada se archiva a mano).
 */
const DISPONIBLES: Record<string, Partial<FilaProducto>> = {
  // 12x45, 12x55
  'SERMAT-12-45': {},
  'SERMAT-12-55': {},
  // 12x65: Herbo, Sermat, Edna y Volta económica
  'HERBO-PLUS': {},
  'SERMAT-12-65': {},
  'EDNA-FW70B': {},
  'VOLTA-65': {},
  // 12x75: Sermat, Herbo y Edna
  'SERMAT-12-75-A': {},
  'SERMAT-12-75-B': {},
  'HERBO-PREMIUM-MAX': {},
  'EDNA-M450': {},
  // 12x80: Herbo
  'HERBO-PLATINUM': {},
  'HERBO-EVOLUTION-80': {},
  // 12x90 baja: Sermat y Edna; 12x90 alta: Sermat, Edna y Herbo
  'SERMAT-12-90-B': {},
  'EDNA-FW90-BAJA': {},
  'SERMAT-12-90-A': {},
  'EDNA-12-90-ALTA': {},
  'HERBO-TRACTION': {},
  // 12x110 baja: Sermat; 12x110 alta: Sermat y Edna
  'SERMAT-12-110-B': {},
  'SERMAT-12-110-A': {},
  'EDNA-FW125': {},
  // Las de camión de Sermat dicen el amperaje en el código: S1600 = 160 Ah, S1800 = 180 Ah.
  'SERMAT-S1600C29': { medida: '12x160', amperaje_ah: '160' },
  'SERMAT-S1800C35': { medida: '12x180', amperaje_ah: '180' },
  'SERMAT-12-220': {},
};

/** Las que el cliente tiene y ninguna fuente trae: entran con lo mínimo, "a revisar". */
const SIN_FUENTE: FilaProducto[] = [
  {
    sku: 'VOLTA-65',
    marca: 'Volta',
    nombre: 'Volta 65',
    medida: '12x65',
    amperaje_ah: '65',
    cca: '',
    gama: 'economica',
    descripcion: '[Datos técnicos a confirmar.]',
    precio_lista: '',
    stock: '',
    fotos: '',
    fuente: 'Lista del cliente',
  },
  {
    sku: 'SERMAT-12-220',
    marca: 'Sermat',
    nombre: 'Sermat 12/220',
    medida: '12x220',
    amperaje_ah: '220',
    cca: '',
    gama: 'reforzada',
    descripcion: '[Modelo y datos técnicos a confirmar con el catálogo de Sermat.]',
    precio_lista: '',
    stock: '',
    fotos: '',
    fuente: 'Lista del cliente',
  },
];

export function soloDisponibles(productos: FilaProducto[]): {
  filas: FilaProducto[];
  faltan: string[];
} {
  const todos = new Map(productos.map((p) => [p.sku, p]));
  for (const p of SIN_FUENTE) if (!todos.has(p.sku)) todos.set(p.sku, p);
  const filas: FilaProducto[] = [];
  const faltan: string[] = [];
  for (const [sku, ajuste] of Object.entries(DISPONIBLES)) {
    const p = todos.get(sku);
    if (p) filas.push({ ...p, ...ajuste });
    else faltan.push(sku);
  }
  return { filas, faltan };
}
