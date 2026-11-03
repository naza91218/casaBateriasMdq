import type { EstadoPedido, Seguimiento } from '@casa/shared';
import { Check, CircleAlert, Clock, MessageCircle, XCircle } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Copiar } from '@/components/checkout/Copiar';
import { ReintentarPago } from '@/components/checkout/ReintentarPago';
import { ErrorApi, pedir } from '@/lib/api';
import { pesos } from '@/lib/formato';

export const metadata: Metadata = { title: 'Tu pedido', robots: { index: false, follow: false } };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string; retorno?: string }>;
};

const RETORNOS = ['approved', 'rejected', 'pending', 'failure'];

const dia = (iso: string) =>
  new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date(iso));

const fecha = (iso: string) =>
  new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date(iso));

/** Pasos de la línea de tiempo según la entrega y el pago, y hasta dónde llegó el pedido. */
function pasos(s: Seguimiento): { titulo: string; hecho: boolean; actual: boolean }[] {
  const [lista, etapa]: [string[], Partial<Record<EstadoPedido, number>>] =
    s.entrega === 'colocacion'
      ? [
          ['Recibido', 'Pagado', 'En camino', 'Colocada'],
          { pendiente_pago: 0, pagado: 1, en_camino: 2, entregado: 3 },
        ]
      : s.medioPago === 'efectivo'
        ? // El efectivo no pasa por "pagado": se paga al retirarla.
          [
            ['Recibido', 'Lista para retirar', 'Entregada'],
            { a_pagar_en_local: 0, listo_para_retirar: 1, entregado: 2 },
          ]
        : [
            ['Recibido', 'Pagado', 'Lista para retirar', 'Entregada'],
            { pendiente_pago: 0, pagado: 1, listo_para_retirar: 2, entregado: 3 },
          ];
  const n = etapa[s.estado] ?? 0;
  return lista.map((titulo, i) => ({ titulo, hecho: i <= n, actual: i === n + 1 }));
}

export default async function PaginaPedido({ params, searchParams }: Props) {
  const [{ id }, q] = await Promise.all([params, searchParams]);
  if (!q.t) notFound();
  const retorno = q.retorno && RETORNOS.includes(q.retorno) ? q.retorno : undefined;

  let s: Seguimiento;
  try {
    const qs = new URLSearchParams({ t: q.t, ...(retorno ? { retorno } : {}) });
    s = await pedir<Seguimiento>(`/pedidos/${encodeURIComponent(id)}?${qs}`, { sinCache: true });
  } catch (e) {
    if (e instanceof ErrorApi && e.estado < 500) notFound();
    throw e;
  }

  const cancelado = s.estado === 'cancelado';
  const esperaTransferencia =
    s.estado === 'pendiente_pago' && s.medioPago === 'transferencia' && s.banco;
  const esperaMp = s.estado === 'pendiente_pago' && s.medioPago === 'mercadopago';

  const titulo = cancelado
    ? 'Tu pedido se canceló'
    : s.estado === 'pendiente_pago'
      ? s.pagoEnVerificacion
        ? 'Estamos confirmando tu pago'
        : s.pagoRechazado
          ? 'El pago no se aprobó'
          : 'Recibimos tu pedido'
      : s.estado === 'entregado'
        ? '¡Listo, ya la tenés!'
        : '¡Gracias por tu compra!';

  return (
    <div className="mx-auto max-w-[900px] px-4 py-10 md:px-12 md:py-14">
      <p className="num text-[17px] font-semibold text-gris-600">Pedido #{s.numero}</p>
      <h1 className="titular mt-1 text-[44px] md:text-[60px]">{titulo}</h1>

      {!cancelado && (
        <ol aria-label="Estado del pedido" className="mt-8 grid auto-cols-fr grid-flow-col gap-2">
          {pasos(s).map((p) => (
            <li key={p.titulo} className="flex flex-col gap-2">
              <span
                className={`h-2 rounded-sm ${p.hecho ? 'bg-rojo' : p.actual ? 'bg-[repeating-linear-gradient(135deg,var(--color-rojo)_0_6px,var(--color-gris-200)_6px_12px)]' : 'bg-gris-200'}`}
              />
              <span
                className={`text-[15px] font-semibold md:text-[17px] ${p.hecho ? 'text-negro' : 'text-gris-600'}`}
              >
                {p.hecho && (
                  <Check aria-hidden size={16} strokeWidth={3} className="mr-1 inline text-rojo" />
                )}
                {p.titulo}
                <span className="sr-only">
                  {p.hecho ? ' (hecho)' : p.actual ? ' (en curso)' : ' (pendiente)'}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}

      {/* Lo que tiene que hacer ahora el comprador. */}
      <div className="mt-8">
        {cancelado && (
          <Caja icono={<XCircle aria-hidden size={26} />}>
            <p>
              Si ya pagaste o creés que es un error, escribinos y lo resolvemos. Si querés, podés
              volver a comprarla.
            </p>
          </Caja>
        )}

        {esperaTransferencia && s.banco && (
          <section
            aria-labelledby="transferir"
            className="rounded-md border-2 border-negro p-5 md:p-7"
          >
            <h2 id="transferir" className="text-[24px] font-bold">
              Transferí <span className="num">{pesos(s.banco.monto)}</span>
            </h2>
            <p className="mt-1 text-gris-600">
              Tenés hasta el {fecha(s.banco.venceEn)}. Si no, el pedido se cancela solo y la batería
              vuelve a la venta.
            </p>
            <dl className="mt-5 divide-y divide-gris-200 border-y border-gris-200">
              {(
                [
                  ['Alias', s.banco.alias, true],
                  ['CBU', s.banco.cbu, true],
                  ['Titular', s.banco.titular, false],
                  ['CUIT', s.banco.cuit, false],
                  ['Monto exacto', pesos(s.banco.monto), true],
                ] as const
              ).map(([k, v, copiable]) => (
                <div key={k} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <dt className="text-[15px] text-gris-600">{k}</dt>
                    <dd className="num text-[19px] font-bold break-all">{v}</dd>
                  </div>
                  {copiable && (
                    <Copiar
                      texto={k === 'Monto exacto' ? String(s.banco!.monto / 100) : v}
                      que={k}
                    />
                  )}
                </div>
              ))}
            </dl>
            <p className="mt-4">
              Cuando recibimos la transferencia te avisamos por mail y te llamamos para coordinar
              {s.entrega === 'colocacion' ? ' la colocación' : ' el retiro'}.
            </p>
          </section>
        )}

        {esperaMp && (
          <Caja
            icono={
              s.pagoRechazado ? (
                <CircleAlert aria-hidden size={26} />
              ) : (
                <Clock aria-hidden size={26} />
              )
            }
          >
            {s.pagoEnVerificacion ? (
              <p>
                Mercado Pago nos está confirmando el pago. Te avisamos por mail apenas se acredite.
              </p>
            ) : (
              <>
                <p>
                  {s.pagoRechazado
                    ? 'Mercado Pago no aprobó el pago. Podés probar con otra tarjeta o medio.'
                    : 'Falta el pago con Mercado Pago para confirmar tu pedido.'}
                </p>
                {s.puedeReintentarPago && (
                  <div className="mt-4">
                    <ReintentarPago pedidoId={id} token={q.t} />
                  </div>
                )}
              </>
            )}
          </Caja>
        )}

        {s.estado === 'a_pagar_en_local' && (
          <Caja icono={<Check aria-hidden size={26} />}>
            <p>
              Te la guardamos {s.venceEn ? `hasta el ${dia(s.venceEn)}` : 'unos días'}. La pagás
              en el local cuando pasás a retirarla.
            </p>
          </Caja>
        )}

        {(s.estado === 'pagado' ||
          s.estado === 'en_camino' ||
          s.estado === 'listo_para_retirar') && (
          <Caja icono={<Check aria-hidden size={26} />}>
            <p>
              {s.estado === 'en_camino'
                ? 'Vamos en camino con tu batería.'
                : s.estado === 'listo_para_retirar'
                  ? 'Tu batería está lista: pasá a retirarla por el local.'
                  : s.entrega === 'colocacion'
                    ? 'Ya está pagado. Te llamamos para coordinar el día de la colocación.'
                    : 'Ya está pagado. Te avisamos cuando esté lista para retirar.'}
            </p>
          </Caja>
        )}
      </div>

      <section aria-labelledby="detalle" className="mt-10">
        <h2 id="detalle" className="titular text-[30px] md:text-[36px]">
          Tu pedido
        </h2>
        <dl className="num mt-4 border-t-2 border-negro">
          {s.items.map((i) => (
            <div
              key={i.nombre}
              className="flex justify-between gap-4 border-b border-gris-200 py-3"
            >
              <dt>
                {i.cantidad} × {i.nombre}
              </dt>
              <dd className="font-semibold">{pesos(i.precioUnitario * i.cantidad)}</dd>
            </div>
          ))}
          {s.descuento > 0 && (
            <div className="flex justify-between gap-4 border-b border-gris-200 py-3 text-rojo-texto">
              <dt>Descuento</dt>
              <dd className="font-semibold">−{pesos(s.descuento)}</dd>
            </div>
          )}
          <div className="flex justify-between gap-4 border-b border-gris-200 py-3">
            <dt>
              {s.entrega === 'colocacion'
                ? `Colocación${s.zona ? ` en ${s.zona}` : ''}`
                : 'Retiro en el local'}
            </dt>
            <dd className="font-semibold">{s.costoZona ? pesos(s.costoZona) : 'Sin costo'}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 py-4">
            <dt className="text-[20px] font-bold">Total</dt>
            <dd className="text-[30px] font-bold">{pesos(s.total)}</dd>
          </div>
        </dl>
      </section>

      <div className="mt-8 flex flex-col gap-3 md:flex-row">
        <a href={s.whatsapp.url} className="boton boton-borde">
          <MessageCircle aria-hidden size={22} />
          ¿Algo no está bien? Escribinos
        </a>
        <Link href="/" className="boton boton-borde">
          Volver a la tienda
        </Link>
      </div>
    </div>
  );
}

function Caja({ icono, children }: { icono: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 rounded-md border-2 border-negro p-5 text-[19px] md:p-7">
      <span className="mt-0.5 flex-none">{icono}</span>
      <div>{children}</div>
    </div>
  );
}
