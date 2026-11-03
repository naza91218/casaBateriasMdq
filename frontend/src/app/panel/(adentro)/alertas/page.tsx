import type { Alerta } from '@casa/shared';
import { CircleAlert } from 'lucide-react';
import Link from 'next/link';
import { ResolverAlerta } from '@/components/panel/AccionesPedido';
import { fechaCorta, pedirPanel } from '@/lib/panel';

export const metadata = { title: 'Alertas' };

const TEXTO = {
  monto_distinto: 'Mercado Pago acreditó un monto distinto al del pedido',
  pago_sobre_cancelado: 'Llegó un pago para un pedido que ya estaba cancelado',
} as const;

export default async function Alertas({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const todas = (await searchParams).estado === 'todas';
  const alertas = await pedirPanel<Alerta[]>(
    `/admin/alertas?estado=${todas ? 'todas' : 'abiertas'}`,
  );
  return (
    <>
      <h1 className="text-[32px] leading-tight font-bold">Alertas de pago</h1>
      <p className="mt-1 max-w-[70ch] text-gris-600">
        Pagos que no coinciden con su pedido. Revisalos en Mercado Pago, resolvelos con el comprador
        y marcalos como resueltos.
      </p>
      <div className="mt-5 flex gap-2">
        {[
          [false, 'Abiertas'],
          [true, 'Todas'],
        ].map(([t, texto]) => (
          <Link
            key={String(t)}
            href={t ? '/panel/alertas?estado=todas' : '/panel/alertas'}
            aria-current={todas === t ? 'page' : undefined}
            className={`inline-flex min-h-11 items-center rounded-full border-2 px-4 font-semibold no-underline ${todas === t ? 'border-negro bg-negro text-blanco' : 'border-gris-300 bg-blanco text-negro'}`}
          >
            {texto as string}
          </Link>
        ))}
      </div>

      {alertas.length === 0 ? (
        <div className="mt-5 rounded-md border-2 border-gris-200 bg-blanco p-8 text-center">
          <p className="text-[20px] font-bold">
            {todas ? 'No hubo alertas' : 'No hay alertas abiertas'}
          </p>
          <p className="mt-1 text-gris-600">Todos los pagos coinciden con sus pedidos.</p>
        </div>
      ) : (
        <ul className="mt-5 flex flex-col gap-3">
          {alertas.map((a) => (
            <li
              key={a.id}
              className={`flex flex-col gap-3 rounded-md border-2 bg-blanco p-4 md:flex-row md:items-center md:justify-between ${a.resueltaEn ? 'border-gris-200' : 'border-rojo-texto'}`}
            >
              <div>
                <p className={`flex gap-2 font-semibold ${a.resueltaEn ? '' : 'text-rojo-texto'}`}>
                  <CircleAlert aria-hidden size={22} className="flex-none" />
                  {TEXTO[a.tipo]}
                </p>
                <p className="num mt-1 text-[16px] text-gris-600">
                  <Link
                    href={`/panel/pedidos/${a.pedidoId}`}
                    className="font-semibold text-negro underline"
                  >
                    Pedido #{a.numeroPedido}
                  </Link>{' '}
                  · {fechaCorta(a.creadoEn)}
                  {a.resueltaEn &&
                    ` · resuelta ${fechaCorta(a.resueltaEn)} por ${a.resueltaPor ?? '—'}`}
                </p>
              </div>
              {!a.resueltaEn && <ResolverAlerta id={a.id} />}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
