import type { EstadoPedido } from '@casa/shared';
import { ESTADOS } from '@/lib/panel';

/** Píldoras de estado del sistema (DESIGN.md, estados de pedido). */
const COLOR: Record<EstadoPedido, string> = {
  pendiente_pago: 'bg-amarillo-aviso text-negro',
  a_pagar_en_local: 'bg-amarillo-aviso text-negro',
  pagado: 'bg-verde-ok text-blanco',
  en_camino: 'bg-negro text-blanco',
  listo_para_retirar: 'bg-naranja text-negro',
  entregado: 'bg-blanco text-verde-ok shadow-[inset_0_0_0_2px_var(--color-verde-ok)]',
  cancelado: 'bg-gris-200 text-gris-600',
};

export function Estado({ estado }: { estado: EstadoPedido }) {
  return (
    <span
      className={`inline-flex h-7 items-center rounded-full px-3 text-[15px] font-bold whitespace-nowrap ${COLOR[estado]}`}
    >
      {ESTADOS[estado]}
    </span>
  );
}
