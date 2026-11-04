/**
 * Medida comercial de una batería: "12x65", o "12x90 alta" / "12x90 baja" cuando la misma medida
 * viene en dos alturas de caja y no le entra cualquiera a cada auto. Sin zod, para el navegador
 * (`@casa/shared/medidas`).
 */
export const PATRON_MEDIDA = /^\d+x\d+( alta| baja)?$/;

/** "12X90 Alta", "12 x 90 a", "12x90baja" → "12x90 alta" / "12x90 baja". Lo demás va en minúsculas. */
export function normalizarMedida(texto: string): string {
  const limpio = texto.trim().toLowerCase();
  const m = limpio.match(/^(\d+)\s*x\s*(\d+)\s*(alta|baja|a|b)?$/);
  if (!m) return limpio;
  const altura = m[3] ? (m[3].startsWith('a') ? ' alta' : ' baja') : '';
  return `${m[1]}x${m[2]}${altura}`;
}
