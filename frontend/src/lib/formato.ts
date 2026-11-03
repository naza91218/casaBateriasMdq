const PESOS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

/** Los importes viajan en centavos (Dinero del backend). */
export function pesos(centavos: number): string {
  return PESOS.format(Math.round(centavos / 100));
}

/** "12x55, 12x60 o 12x65". */
export function enLista(items: string[], conjuncion = 'o'): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} ${conjuncion} ${items.at(-1)}`;
}
