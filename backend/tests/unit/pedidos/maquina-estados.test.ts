import { describe, expect, test } from 'vitest';
import {
  ESTADOS,
  puedeTransicionar,
  transicionesPermitidas,
  type EstadoPedido,
} from '../../../src/modules/pedidos/domain/maquina-estados.js';

const validas: [EstadoPedido, EstadoPedido, 'colocacion' | 'retiro'][] = [
  ['pendiente_pago', 'pagado', 'colocacion'],
  ['pendiente_pago', 'cancelado', 'retiro'],
  ['a_pagar_en_local', 'entregado', 'retiro'],
  ['a_pagar_en_local', 'cancelado', 'retiro'],
  ['pagado', 'en_camino', 'colocacion'],
  ['pagado', 'listo_para_retirar', 'retiro'],
  ['pagado', 'cancelado', 'colocacion'],
  ['en_camino', 'entregado', 'colocacion'],
  ['listo_para_retirar', 'entregado', 'retiro'],
];

describe('máquina de estados del pedido (FR-032)', () => {
  test.each(validas)('%s → %s (%s) es válida', (de, a, entrega) => {
    expect(puedeTransicionar(de, a, entrega)).toBe(true);
  });

  test('cualquier otra transición se rechaza', () => {
    const entregas = ['colocacion', 'retiro'] as const;
    for (const de of ESTADOS) {
      for (const a of ESTADOS) {
        for (const entrega of entregas) {
          const esperada = validas.some(([d, x, e]) => d === de && x === a && e === entrega);
          // pendiente_pago→pagado/cancelado, pagado→cancelado y a_pagar_en_local→* valen para ambas entregas
          const independiente = validas.some(
            ([d, x]) => d === de && x === a && !['en_camino', 'listo_para_retirar'].includes(x),
          );
          expect(puedeTransicionar(de, a, entrega), `${de}→${a} (${entrega})`).toBe(esperada || independiente);
        }
      }
    }
  });

  test('en camino es solo para colocación; listo para retirar, solo para retiro', () => {
    expect(puedeTransicionar('pagado', 'en_camino', 'retiro')).toBe(false);
    expect(puedeTransicionar('pagado', 'listo_para_retirar', 'colocacion')).toBe(false);
  });

  test('US3-06 y US3-07: un pedido entregado o cancelado no admite cambios', () => {
    expect(transicionesPermitidas('entregado', 'colocacion')).toEqual([]);
    expect(transicionesPermitidas('cancelado', 'retiro')).toEqual([]);
    expect(puedeTransicionar('entregado', 'pendiente_pago', 'colocacion')).toBe(false);
  });
});
