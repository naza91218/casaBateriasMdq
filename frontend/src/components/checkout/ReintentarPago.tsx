'use client';

import { CreditCard } from 'lucide-react';
import { useState } from 'react';
import { enviar, ErrorApi } from '@/lib/api';

/** Vuelve a abrir Mercado Pago para un pedido rechazado o que no se terminó de pagar. */
export function ReintentarPago({ pedidoId, token }: { pedidoId: string; token: string }) {
  const [estado, setEstado] = useState<'listo' | 'yendo' | string>('listo');
  return (
    <div>
      <button
        type="button"
        disabled={estado === 'yendo'}
        onClick={async () => {
          setEstado('yendo');
          try {
            const r = await enviar<{ initPoint: string | null }>(
              `/pedidos/${pedidoId}/reintentar-pago?t=${encodeURIComponent(token)}`,
            );
            if (r.initPoint) window.location.assign(r.initPoint);
            else setEstado('Mercado Pago no respondió. Probá de nuevo en un momento.');
          } catch (e) {
            setEstado(
              e instanceof ErrorApi && e.estado < 500
                ? e.message
                : 'No pudimos abrir Mercado Pago. Probá de nuevo en un momento.',
            );
          }
        }}
        className="boton boton-rojo w-full disabled:cursor-wait disabled:opacity-70 md:w-auto"
      >
        <CreditCard aria-hidden size={22} />
        {estado === 'yendo' ? 'Abriendo Mercado Pago…' : 'Pagar con Mercado Pago'}
      </button>
      {estado !== 'listo' && estado !== 'yendo' && (
        <p role="alert" className="mt-3 font-semibold text-rojo-texto">
          {estado}
        </p>
      )}
    </div>
  );
}
