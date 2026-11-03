'use client';

import { ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { unidades, useCarrito } from '@/lib/carrito';

/** Carrito del encabezado, con la cantidad de baterías cargadas. */
export function BotonCarrito() {
  const n = unidades(useCarrito());
  return (
    <Link
      href="/carrito"
      aria-label={n ? `Carrito, ${n} ${n === 1 ? 'batería' : 'baterías'}` : 'Carrito, vacío'}
      className="relative grid size-12 place-items-center rounded-sm text-negro transition-colors duration-150 hover:bg-gris-100"
    >
      <ShoppingCart aria-hidden size={24} strokeWidth={2} />
      {n > 0 && (
        <span
          aria-hidden
          className="num absolute top-1 right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-rojo px-1 text-[13px] leading-none font-bold text-blanco"
        >
          {n}
        </span>
      )}
    </Link>
  );
}
