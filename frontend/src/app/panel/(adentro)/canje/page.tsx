import type { ConsultaCanjeAdmin } from '@casa/shared';
import { Download, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { MarcarCanje } from '@/components/panel/MarcarCanje';
import { fechaCorta, pedirPanel } from '@/lib/panel';

export const metadata = { title: 'Consultas de canje' };

export default async function Canje({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const e = (await searchParams).estado;
  const estado = e === 'atendida' || e === 'todas' ? e : 'pendiente';
  const consultas = await pedirPanel<ConsultaCanjeAdmin[]>(
    `/admin/consultas-canje${estado === 'todas' ? '' : `?estado=${estado}`}`,
  );
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[32px] leading-tight font-bold">Consultas de canje</h1>
        <a
          href="/api/v1/admin/consultas-canje?formato=csv"
          className="boton boton-borde !min-h-12 !px-4 !text-[17px]"
        >
          <Download aria-hidden size={20} /> Bajar planilla
        </a>
      </div>
      <p className="mt-1 text-gris-600">
        Gente que quiere entregar su batería usada. Escribiles y marcalas como atendidas.
      </p>
      <nav aria-label="Filtrar" className="mt-5 flex gap-2">
        {(
          [
            ['pendiente', 'Pendientes'],
            ['atendida', 'Atendidas'],
            ['todas', 'Todas'],
          ] as const
        ).map(([v, t]) => (
          <Link
            key={v}
            href={v === 'pendiente' ? '/panel/canje' : `/panel/canje?estado=${v}`}
            aria-current={estado === v ? 'page' : undefined}
            className={`inline-flex min-h-11 items-center rounded-full border-2 px-4 font-semibold no-underline ${estado === v ? 'border-negro bg-negro text-blanco' : 'border-gris-300 bg-blanco text-negro'}`}
          >
            {t}
          </Link>
        ))}
      </nav>
      {consultas.length === 0 ? (
        <div className="mt-5 rounded-md border-2 border-gris-200 bg-blanco p-8 text-center font-bold">
          No hay consultas
        </div>
      ) : (
        <ul className="mt-5 flex flex-col gap-2">
          {consultas.map((c) => (
            <li
              key={c.id}
              className="flex flex-col gap-3 rounded-md border-2 border-gris-200 bg-blanco p-4 md:flex-row md:items-center"
            >
              <div className="min-w-0 flex-1">
                <p className="font-bold">
                  {c.nombre} <span className="num font-semibold text-gris-600">· {c.telefono}</span>
                </p>
                <p className="text-[16px] text-gris-600">
                  {c.auto} · {c.localidad}
                  {c.bateriaUsada && ` · usada: ${c.bateriaUsada}`}
                  {c.producto && ` · quiere: ${c.producto}`}
                </p>
                <p className="num text-[15px] text-gris-600">{fechaCorta(c.creadoEn)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href={c.whatsapp.url} className="boton boton-borde !min-h-11 !px-4 !text-[16px]">
                  <MessageCircle aria-hidden size={18} /> WhatsApp
                </a>
                <MarcarCanje id={c.id} estado={c.estado} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
