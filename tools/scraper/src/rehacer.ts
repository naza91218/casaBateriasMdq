import { medidaDeCodigo } from './fuentes/sermat-pdf.js';
import { altoDe, medida, type FilaCompatibilidad, type FilaProducto } from './planillas.js';

/**
 * Para pasar planillas ya generadas a alta o baja (de 12x90 a 12x110) sin volver a bajar las fuentes
 * (`--desde-planillas`). Hace lo mismo que el scraper con sus datos originales.
 */
const SIN_ALTURA = /^12x(90|95|100|110)$/;

/** Por el alto de la caja en la descripción, o por la letra del código de Sermat (-A, -B, -C). */
export function rehacerMedidaProducto(p: FilaProducto): FilaProducto {
  const m = p.medida.match(SIN_ALTURA);
  if (!m) return p;
  const alto = altoDe(p.descripcion);
  const letra = p.sku.match(/-([ABC])$/)?.[1];
  const altura =
    alto ?? (letra === 'B' ? 'baja' : letra === 'A' || letra === 'C' ? 'alta' : undefined);
  return { ...p, medida: medida(12, Number(m[1]), altura) };
}

/**
 * Los códigos de Sermat del texto original ("12-90 BD") dicen la altura. Las filas de Herbo no
 * traen código: sus medidas de 12x90 a 12x110 (Traction, Caterpillar) son de caja alta.
 */
export function rehacerMedidasAuto(f: FilaCompatibilidad): FilaCompatibilidad {
  const actuales = f.medidas.split('|').filter(Boolean);
  if (!actuales.some((x) => SIN_ALTURA.test(x))) return f;
  const deCodigos = [...f.texto_original.matchAll(/12-\d{2,3}(?: [A-Z]+)?/g)]
    .map((c) => medidaDeCodigo(c[0]))
    .filter((x): x is string => x !== null);
  const nuevas = new Set<string>();
  for (const m of actuales) {
    if (!SIN_ALTURA.test(m)) {
      nuevas.add(m);
      continue;
    }
    const conAltura = deCodigos.filter((x) => x.startsWith(`${m} `));
    if (conAltura.length) conAltura.forEach((x) => nuevas.add(x));
    else nuevas.add(`${m} alta`);
  }
  const amperes = (x: string) => parseInt(x.split('x')[1] ?? '', 10);
  return {
    ...f,
    medidas: [...nuevas].sort((a, b) => amperes(a) - amperes(b) || a.localeCompare(b)).join('|'),
  };
}
