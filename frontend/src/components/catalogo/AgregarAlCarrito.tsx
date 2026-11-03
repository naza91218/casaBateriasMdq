'use client';

import { MAX_UNIDADES_POR_PEDIDO } from '@casa/shared/limites';
import { Check, Minus, Plus, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { medir } from '@/lib/analitica';
import { agregar, unidades, useCarrito } from '@/lib/carrito';

export function AgregarAlCarrito({
  productoId,
  slug,
  nombre,
  precio,
}: {
  productoId: string;
  slug: string;
  nombre: string;
  /** Centavos, solo para medir (el precio que se cobra lo calcula el servidor). */
  precio: number;
}) {
  const carrito = useCarrito();
  const [cantidad, setCantidad] = useState(1);
  const [agregado, setAgregado] = useState(false);
  const libres = MAX_UNIDADES_POR_PEDIDO - unidades(carrito);
  const tope = Math.max(1, libres);

  if (agregado) {
    return (
      <div role="status" className="rounded-md border-2 border-negro p-5">
        <p className="flex items-center gap-2.5 text-[19px] font-bold">
          <span className="grid size-7 place-items-center rounded-sm bg-verde-ok text-blanco">
            <Check aria-hidden size={18} strokeWidth={3} />
          </span>
          La agregamos al carrito
        </p>
        <div className="mt-4 flex flex-col gap-3 md:flex-row">
          <Link href="/carrito" className="boton boton-rojo">
            Ir a pagar
          </Link>
          <button type="button" onClick={() => setAgregado(false)} className="boton boton-borde">
            Seguir mirando
          </button>
        </div>
      </div>
    );
  }

  if (libres <= 0) {
    return (
      <p className="rounded-md border-2 border-gris-200 p-5 font-semibold">
        Ya tenés {MAX_UNIDADES_POR_PEDIDO} baterías en el carrito, el máximo por pedido. Para más,{' '}
        <Link href="/carrito" className="text-rojo-texto underline">
          revisá el carrito
        </Link>{' '}
        o escribinos por WhatsApp.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 md:flex-row">
      <div
        className="flex h-14 items-center rounded-sm border-2 border-gris-300"
        role="group"
        aria-label="Cantidad"
      >
        <button
          type="button"
          onClick={() => setCantidad((c) => Math.max(1, c - 1))}
          disabled={cantidad <= 1}
          aria-label="Una menos"
          className="grid size-13 place-items-center text-negro disabled:text-gris-400"
        >
          <Minus aria-hidden size={22} />
        </button>
        <output aria-live="polite" className="num w-10 text-center text-[20px] font-bold">
          {cantidad}
        </output>
        <button
          type="button"
          onClick={() => setCantidad((c) => Math.min(tope, c + 1))}
          disabled={cantidad >= tope}
          aria-label="Una más"
          className="grid size-13 place-items-center text-negro disabled:text-gris-400"
        >
          <Plus aria-hidden size={22} />
        </button>
      </div>
      <button
        type="button"
        onClick={() => {
          agregar({ productoId, slug, nombre, cantidad });
          medir('add_to_cart', [{ id: productoId, nombre, precio, cantidad }]);
          setAgregado(true);
          setCantidad(1);
        }}
        className="boton boton-rojo flex-1"
      >
        <ShoppingCart aria-hidden size={22} />
        Agregar al carrito
      </button>
    </div>
  );
}
