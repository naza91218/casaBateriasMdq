'use client';

import type { ResumenAdmin } from '@casa/shared';
import {
  Bell,
  Car,
  ClipboardList,
  House,
  LogOut,
  Menu,
  Package,
  Recycle,
  Settings,
  Upload,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { enviar } from '@/lib/api';

/** Barra lateral negra en la compu; en el celular, barra arriba con menú desplegable. */
export function NavPanel({ email, resumen }: { email: string; resumen: ResumenAdmin }) {
  const ruta = usePathname();
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);

  const items = [
    { href: '/panel', texto: 'Inicio', icono: House, n: 0 },
    {
      href: '/panel/pedidos',
      texto: 'Pedidos',
      icono: ClipboardList,
      n: resumen.pedidosPorAtender,
    },
    { href: '/panel/alertas', texto: 'Alertas', icono: Bell, n: resumen.alertasAbiertas },
    { href: '/panel/productos', texto: 'Productos', icono: Package, n: resumen.productosARevisar },
    { href: '/panel/vehiculos', texto: 'Autos', icono: Car, n: 0 },
    { href: '/panel/importar', texto: 'Importar', icono: Upload, n: 0 },
    { href: '/panel/canje', texto: 'Canje', icono: Recycle, n: resumen.consultasCanjePendientes },
    { href: '/panel/configuracion', texto: 'Configuración', icono: Settings, n: 0 },
  ] as { href: string; texto: string; icono: typeof House; n: number; pronto?: boolean }[];
  const activo = (href: string) => (href === '/panel' ? ruta === '/panel' : ruta.startsWith(href));

  async function salir() {
    await enviar('/auth/salir').catch(() => null);
    router.replace('/panel/ingresar');
    router.refresh();
  }

  const lista = (
    <nav aria-label="Panel">
      <ul className="flex flex-col gap-1">
        {items.map(({ href, texto, icono: Icono, n, pronto }) =>
          pronto ? (
            <li key={href}>
              <span className="flex min-h-12 items-center gap-3 rounded-sm px-3 font-semibold text-gris-600">
                <Icono aria-hidden size={22} />
                {texto}
                <span className="ml-auto text-[13px] font-semibold">Pronto</span>
              </span>
            </li>
          ) : (
            <li key={href}>
              <Link
                href={href}
                onClick={() => setAbierto(false)}
                aria-current={activo(href) ? 'page' : undefined}
                className={`flex min-h-12 items-center gap-3 rounded-sm px-3 font-semibold no-underline transition-colors duration-150 ${activo(href) ? 'bg-blanco text-negro' : 'text-blanco hover:bg-gris-900'}`}
              >
                <Icono aria-hidden size={22} />
                {texto}
                {n > 0 && (
                  <span className="num ml-auto grid h-6 min-w-6 place-items-center rounded-full bg-rojo px-1.5 text-[14px] font-bold text-blanco">
                    {n}
                  </span>
                )}
              </Link>
            </li>
          ),
        )}
      </ul>
      <div className="mt-6 border-t border-gris-800 pt-4">
        <p className="truncate px-3 text-[15px] text-gris-400" title={email}>
          {email}
        </p>
        <button
          type="button"
          onClick={salir}
          className="mt-1 flex min-h-12 w-full items-center gap-3 rounded-sm px-3 font-semibold text-blanco hover:bg-gris-900"
        >
          <LogOut aria-hidden size={22} />
          Cerrar sesión
        </button>
      </div>
    </nav>
  );

  return (
    <aside className="oscuro bg-negro text-blanco lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto">
      <div className="flex h-16 items-center justify-between px-4 lg:h-20 lg:px-5">
        <Link href="/panel" className="flex items-center gap-2.5 no-underline">
          <img src="/marca/isotipo.svg" alt="" width={520} height={328} className="h-8 w-auto" />
          <span className="text-[22px] font-bold text-blanco">Panel</span>
        </Link>
        <button
          type="button"
          aria-expanded={abierto}
          aria-label={abierto ? 'Cerrar el menú' : 'Abrir el menú'}
          onClick={() => setAbierto((a) => !a)}
          className="grid size-12 place-items-center rounded-sm hover:bg-gris-900 lg:hidden"
        >
          {abierto ? <X aria-hidden size={26} /> : <Menu aria-hidden size={26} />}
        </button>
      </div>
      <div className={`px-3 pb-5 lg:block ${abierto ? 'block' : 'hidden'}`}>{lista}</div>
    </aside>
  );
}
