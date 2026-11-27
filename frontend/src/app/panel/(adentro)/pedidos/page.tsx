import { EstadoPedido, type ListaPedidosAdmin } from '@casa/shared';
import { Bell, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import Link from 'next/link';
import { Estado } from '@/components/panel/Estado';
import { pesos } from '@/lib/formato';
import { ESTADOS, fechaCorta, MEDIOS, pedirPanel } from '@/lib/panel';

export const metadata = { title: 'Pedidos' };

const POR_PAGINA = 30;
const FILTROS: (EstadoPedido | '')[] = [
  '',
  'pendiente_pago',
  'a_pagar_en_local',
  'pagado',
  'en_camino',
  'listo_para_retirar',
  'entregado',
  'cancelado',
];

export default async function Pedidos({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; pagina?: string }>;
}) {
  const p = await searchParams;
  const estado = EstadoPedido.safeParse(p.estado).data;
  const pagina = Math.max(1, Number.parseInt(p.pagina ?? '1', 10) || 1);
  const q = new URLSearchParams({ pagina: String(pagina), porPagina: String(POR_PAGINA) });
  if (estado) q.set('estado', estado);
  const lista = await pedirPanel<ListaPedidosAdmin>(`/admin/pedidos?${q}`);
  const paginas = Math.ceil(lista.total / POR_PAGINA);
  const url = (cambios: { estado?: string; pagina?: number }) => {
    const u = new URLSearchParams();
    const e = 'estado' in cambios ? cambios.estado : estado;
    if (e) u.set('estado', e);
    if (cambios.pagina && cambios.pagina > 1) u.set('pagina', String(cambios.pagina));
    return `/panel/pedidos${u.size ? `?${u}` : ''}`;
  };

  return (
    <>
      <h1 className="text-[32px] leading-tight font-bold">Pedidos</h1>

      <nav
        aria-label="Filtrar por estado"
        className="mt-5 -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0"
      >
        <ul className="flex gap-2 md:flex-wrap">
          {FILTROS.map((f) => {
            const activo = (estado ?? '') === f;
            return (
              <li key={f || 'todos'} className="flex-none">
                <Link
                  href={url({ estado: f || undefined })}
                  aria-current={activo ? 'page' : undefined}
                  className={`inline-flex min-h-11 items-center rounded-full border-2 px-4 font-semibold no-underline ${activo ? 'border-negro bg-negro text-blanco' : 'border-gris-300 bg-blanco text-negro hover:border-negro'}`}
                >
                  {f ? ESTADOS[f] : 'Todos'}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <p className="num mt-5 text-gris-600">
        {lista.total} {lista.total === 1 ? 'pedido' : 'pedidos'}
      </p>

      {lista.items.length === 0 ? (
        <div className="mt-3 rounded-md border-2 border-gris-200 bg-blanco p-8 text-center">
          <p className="text-[20px] font-bold">
            No hay pedidos {estado ? `en "${ESTADOS[estado]}"` : 'todavía'}
          </p>
          {estado && (
            <Link
              href="/panel/pedidos"
              className="mt-2 inline-block font-semibold text-rojo-texto underline"
            >
              Ver todos
            </Link>
          )}
        </div>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {lista.items.map((o) => (
            <li key={o.id}>
              <Link
                href={`/panel/pedidos/${o.id}`}
                className={`grid gap-x-6 gap-y-2 rounded-md border-2 bg-blanco p-4 no-underline transition-colors duration-150 hover:border-negro md:grid-cols-[90px_minmax(0,1fr)_170px_130px_auto] md:items-center ${o.destacado || o.alertasAbiertas ? 'border-rojo-texto' : 'border-gris-200'}`}
              >
                <span>
                  <span className="num block text-[20px] font-bold">#{o.numero}</span>
                  <span className="num block text-[15px] text-gris-600">
                    {fechaCorta(o.creadoEn)}
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[18px] font-semibold">{o.comprador}</span>
                  <span className="block text-[15px] text-gris-600">
                    {o.entrega === 'colocacion' ? 'Colocación' : 'Retiro'} · {MEDIOS[o.medioPago]}
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  <Estado estado={o.estado} />
                </span>
                <span className="num text-[18px] font-bold md:text-right">{pesos(o.total)}</span>
                <span className="flex flex-col gap-1 text-[15px] font-semibold text-rojo-texto">
                  {o.alertasAbiertas > 0 && (
                    <span className="flex items-center gap-1.5">
                      <Bell aria-hidden size={16} /> {o.alertasAbiertas} alerta
                      {o.alertasAbiertas > 1 ? 's' : ''}
                    </span>
                  )}
                  {o.destacado && (
                    <span className="flex items-center gap-1.5">
                      <Clock aria-hidden size={16} /> Espera hace {o.diasEsperando} días
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {paginas > 1 && (
        <nav aria-label="Páginas" className="mt-6 flex items-center justify-center gap-3">
          {pagina > 1 && (
            <Link href={url({ pagina: pagina - 1 })} className="boton boton-borde">
              <ChevronLeft aria-hidden size={22} /> Anterior
            </Link>
          )}
          <span className="num font-semibold">
            Página {pagina} de {paginas}
          </span>
          {pagina < paginas && (
            <Link href={url({ pagina: pagina + 1 })} className="boton boton-borde">
              Siguiente <ChevronRight aria-hidden size={22} />
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
