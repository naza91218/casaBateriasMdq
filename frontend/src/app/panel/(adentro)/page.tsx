import type { ResumenAdmin } from '@casa/shared';
import { Bell, ClipboardList, Clock, MessageSquare, Package } from 'lucide-react';
import Link from 'next/link';
import { pedirPanel } from '@/lib/panel';

export const metadata = { title: 'Inicio' };

/** Lo que espera a Mateo al abrir el panel (FR-043): cada contador lleva a su lista. */
export default async function Inicio() {
  const r = await pedirPanel<ResumenAdmin>('/admin/resumen');
  const tarjetas = [
    {
      n: r.pedidosPorAtender,
      texto: 'Pedidos por atender',
      href: '/panel/pedidos',
      icono: ClipboardList,
    },
    {
      n: r.pedidosDestacados,
      texto: 'Efectivo esperando hace más de 48 h',
      href: '/panel/pedidos?estado=a_pagar_en_local',
      icono: Clock,
    },
    { n: r.alertasAbiertas, texto: 'Alertas de pago', href: '/panel/alertas', icono: Bell },
    {
      n: r.productosARevisar,
      texto: 'Productos a revisar',
      href: '/panel/productos?estado=a_revisar',
      icono: Package,
    },
    {
      n: r.consultasCanjePendientes,
      texto: 'Consultas de canje',
      href: '/panel/canje',
      icono: MessageSquare,
    },
  ];
  return (
    <>
      <h1 className="text-[32px] leading-tight font-bold">Hola</h1>
      <p className="mt-1 text-gris-600">Esto es lo que tenés pendiente.</p>
      <ul className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tarjetas.map(({ n, texto, href, icono: Icono }) => {
          const contenido = (
            <>
              <span
                className={`grid size-12 flex-none place-items-center rounded-sm ${n ? 'bg-rojo text-blanco' : 'bg-gris-200 text-gris-600'}`}
              >
                <Icono aria-hidden size={24} />
              </span>
              <span>
                <span className="num block text-[34px] leading-none font-bold">{n}</span>
                <span className="mt-1 block font-semibold">{texto}</span>
                {!href && (
                  <span className="text-[15px] text-gris-600">
                    Se maneja en la próxima etapa del panel
                  </span>
                )}
              </span>
            </>
          );
          return (
            <li key={texto}>
              {href ? (
                <Link
                  href={href}
                  className="flex items-center gap-4 rounded-md border-2 border-gris-200 bg-blanco p-5 no-underline transition-colors duration-150 hover:border-negro"
                >
                  {contenido}
                </Link>
              ) : (
                <div className="flex items-center gap-4 rounded-md border-2 border-gris-200 bg-blanco p-5">
                  {contenido}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
