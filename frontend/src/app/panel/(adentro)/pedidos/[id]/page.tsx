import type { PedidoDetalleAdmin } from '@casa/shared';
import { ChevronLeft, CircleAlert, MapPin, MessageCircle, Phone } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AccionesPedido, ResolverAlerta } from '@/components/panel/AccionesPedido';
import { Estado } from '@/components/panel/Estado';
import { ErrorApi } from '@/lib/api';
import { pesos } from '@/lib/formato';
import { ESTADOS, fechaCorta, MEDIOS, pedirPanel } from '@/lib/panel';

const ALERTAS = {
  monto_distinto: 'Mercado Pago acreditó un monto distinto al del pedido',
  pago_sobre_cancelado: 'Llegó un pago para un pedido que ya estaba cancelado',
} as const;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return { title: `Pedido ${(await params).id.slice(0, 8)}` };
}

export default async function DetallePedido({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let p: PedidoDetalleAdmin;
  try {
    p = await pedirPanel<PedidoDetalleAdmin>(`/admin/pedidos/${encodeURIComponent(id)}`);
  } catch (e) {
    if (e instanceof ErrorApi && (e.estado === 404 || e.estado === 400)) notFound();
    throw e;
  }
  const c = p.comprador;
  const direccion = [c.calle, c.numero].filter(Boolean).join(' ');
  const alertasAbiertas = p.alertas.filter((a) => !a.resueltaEn);

  return (
    <>
      <Link
        href="/panel/pedidos"
        className="inline-flex min-h-11 items-center gap-1 font-semibold text-negro no-underline hover:text-rojo-texto"
      >
        <ChevronLeft aria-hidden size={22} />
        Pedidos
      </Link>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="num text-[32px] leading-tight font-bold">Pedido #{p.numero}</h1>
        <Estado estado={p.estado} />
      </div>
      <p className="mt-1 text-gris-600">
        {fechaCorta(p.creadoEn)} · {MEDIOS[p.medioPago]} ·{' '}
        {p.entrega === 'colocacion' ? 'Colocación' : 'Retiro en el local'}
        {p.venceEn && ` · vence ${fechaCorta(p.venceEn)}`}
        {p.destacado && p.diasEsperando !== null && (
          <span className="font-semibold text-rojo-texto">
            {' '}
            · espera hace {p.diasEsperando} días
          </span>
        )}
      </p>

      {alertasAbiertas.length > 0 && (
        <ul className="mt-5 flex flex-col gap-3">
          {alertasAbiertas.map((a) => (
            <li
              key={a.id}
              className="flex flex-col gap-3 rounded-md border-2 border-rojo-texto bg-blanco p-4 md:flex-row md:items-center md:justify-between"
            >
              <p className="flex gap-2 font-semibold text-rojo-texto">
                <CircleAlert aria-hidden size={22} className="flex-none" />
                {ALERTAS[a.tipo]} ({fechaCorta(a.creadoEn)})
              </p>
              <ResolverAlerta id={a.id} />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="flex flex-col gap-5">
          <section
            aria-labelledby="comprador"
            className="rounded-md border-2 border-gris-200 bg-blanco p-5"
          >
            <h2 id="comprador" className="text-[21px] font-bold">
              Comprador
            </h2>
            {c.anonimizado ? (
              <p className="mt-2 text-gris-600">Los datos personales de este pedido se borraron.</p>
            ) : (
              <dl className="mt-3 grid gap-x-6 gap-y-3 md:grid-cols-2">
                <Dato k="Nombre" v={c.nombre} />
                <Dato k="DNI" v={c.dni} num />
                <Dato k="Teléfono" v={c.telefono} num />
                <Dato k="Mail" v={c.email} />
                {p.entrega === 'colocacion' && (
                  <>
                    <Dato k="Dirección" v={`${direccion || '—'}${p.zona ? ` · ${p.zona}` : ''}`} />
                    <Dato k="Referencias" v={c.referencias || '—'} />
                  </>
                )}
              </dl>
            )}
            {!c.anonimizado && (
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={`tel:${c.telefono.replace(/[^\d+]/g, '')}`}
                  className="boton boton-borde !min-h-12 !px-4 !text-[17px]"
                >
                  <Phone aria-hidden size={20} /> Llamar
                </a>
                {p.whatsapp && (
                  <a
                    href={p.whatsapp.url}
                    className="boton boton-borde !min-h-12 !px-4 !text-[17px]"
                  >
                    <MessageCircle aria-hidden size={20} /> WhatsApp
                  </a>
                )}
                {p.mapaUrl && (
                  <a
                    href={p.mapaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="boton boton-borde !min-h-12 !px-4 !text-[17px]"
                  >
                    <MapPin aria-hidden size={20} /> Mapa
                  </a>
                )}
              </div>
            )}
          </section>

          <section
            aria-labelledby="productos"
            className="rounded-md border-2 border-gris-200 bg-blanco p-5"
          >
            <h2 id="productos" className="text-[21px] font-bold">
              Productos
            </h2>
            <dl className="num mt-3">
              {p.items.map((i) => (
                <div
                  key={i.nombre}
                  className="flex justify-between gap-4 border-b border-gris-200 py-2.5"
                >
                  <dt>
                    {i.cantidad} × {i.nombre}
                  </dt>
                  <dd className="font-semibold">{pesos(i.precioUnitario * i.cantidad)}</dd>
                </div>
              ))}
              {p.descuento > 0 && <Linea k="Descuento" v={`−${pesos(p.descuento)}`} />}
              {p.costoZona > 0 && <Linea k="Costo de la zona" v={pesos(p.costoZona)} />}
              <div className="flex justify-between gap-4 pt-3">
                <dt className="text-[19px] font-bold">Total</dt>
                <dd className="text-[24px] font-bold">{pesos(p.total)}</dd>
              </div>
            </dl>
          </section>

          <section
            aria-labelledby="historial"
            className="rounded-md border-2 border-gris-200 bg-blanco p-5"
          >
            <h2 id="historial" className="text-[21px] font-bold">
              Historial
            </h2>
            <ol className="mt-3 flex flex-col gap-2.5">
              {p.eventos.map((e, i) => (
                <li key={i} className={`text-[16px] ${e.rechazado ? 'text-rojo-texto' : ''}`}>
                  <span className="num text-gris-600">{fechaCorta(e.creadoEn)}</span> ·{' '}
                  <strong>{ESTADOS[e.a]}</strong>
                  {e.rechazado && ' (rechazado)'} · {e.actor}
                  {e.motivo && <span className="text-gris-600"> · {e.motivo}</span>}
                </li>
              ))}
              {p.pagos.map((pg, i) => (
                <li key={`p${i}`} className="text-[16px]">
                  <span className="num text-gris-600">{fechaCorta(pg.creadoEn)}</span> · Pago{' '}
                  {MEDIOS[pg.medio]} <strong className="num">{pesos(pg.monto)}</strong> ·{' '}
                  {pg.estado}
                  {pg.confirmadoPor && ` · confirmado por ${pg.confirmadoPor}`}
                  {pg.idExterno && <span className="text-gris-600"> · {pg.idExterno}</span>}
                </li>
              ))}
              {p.arrepentimientos.map((a) => (
                <li key={a.codigo} className="text-[16px] font-semibold text-rojo-texto">
                  <span className="num">{fechaCorta(a.creadoEn)}</span> · Botón de arrepentimiento (
                  {a.codigo})
                </li>
              ))}
            </ol>
          </section>
        </div>

        <section
          aria-labelledby="acciones"
          className="rounded-md border-2 border-negro bg-blanco p-5 lg:sticky lg:top-6"
        >
          <h2 id="acciones" className="sr-only">
            Acciones
          </h2>
          {p.transicionesPermitidas.length ||
          p.acciones.confirmarTransferencia ||
          p.acciones.registrarEfectivo ||
          p.puedeAnonimizar ? (
            <AccionesPedido p={p} />
          ) : (
            <p className="text-gris-600">Este pedido no tiene acciones pendientes.</p>
          )}
        </section>
      </div>
    </>
  );
}

function Dato({ k, v, num = false }: { k: string; v: string; num?: boolean }) {
  return (
    <div>
      <dt className="text-[15px] text-gris-600">{k}</dt>
      <dd className={`text-[18px] font-semibold break-words ${num ? 'num' : ''}`}>{v}</dd>
    </div>
  );
}

function Linea({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-gris-200 py-2.5">
      <dt>{k}</dt>
      <dd className="font-semibold">{v}</dd>
    </div>
  );
}
