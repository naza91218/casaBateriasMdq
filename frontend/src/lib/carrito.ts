'use client';

import { MAX_UNIDADES_POR_PEDIDO } from '@casa/shared';
import { useSyncExternalStore } from 'react';

/**
 * Carrito del navegador (sin cuenta, constitución I). Guarda solo qué y cuántas: el precio y el
 * stock los confirma el servidor al cotizar, así que un precio viejo guardado acá no cobra nada.
 */
export type ItemCarrito = { productoId: string; slug: string; nombre: string; cantidad: number };

const CLAVE = 'casa:carrito';
const oyentes = new Set<() => void>();
let cache: ItemCarrito[] | null = null;

function leer(): ItemCarrito[] {
  if (cache) return cache;
  try {
    const crudo = JSON.parse(localStorage.getItem(CLAVE) ?? '[]') as unknown;
    cache = Array.isArray(crudo) ? (crudo as ItemCarrito[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function guardar(items: ItemCarrito[]) {
  cache = items;
  try {
    localStorage.setItem(CLAVE, JSON.stringify(items));
  } catch {
    // Navegación privada sin almacenamiento: el carrito vive mientras dure la pestaña.
  }
  oyentes.forEach((f) => f());
}

const VACIO: ItemCarrito[] = [];

export function useCarrito(): ItemCarrito[] {
  return useSyncExternalStore(
    (f) => {
      oyentes.add(f);
      const otraPestana = (e: StorageEvent) => {
        if (e.key === CLAVE) {
          cache = null;
          f();
        }
      };
      window.addEventListener('storage', otraPestana);
      return () => {
        oyentes.delete(f);
        window.removeEventListener('storage', otraPestana);
      };
    },
    leer,
    () => VACIO,
  );
}

/** Total de baterías en el carrito: no puede pasar el tope por pedido. */
export const unidades = (items: ItemCarrito[]) => items.reduce((a, i) => a + i.cantidad, 0);

export function agregar(item: ItemCarrito): ItemCarrito[] {
  const items = leer();
  const libres = MAX_UNIDADES_POR_PEDIDO - unidades(items);
  const cantidad = Math.max(0, Math.min(item.cantidad, libres));
  if (!cantidad) return items;
  const existente = items.find((i) => i.productoId === item.productoId);
  const nuevos = existente
    ? items.map((i) => (i === existente ? { ...i, cantidad: i.cantidad + cantidad } : i))
    : [...items, { ...item, cantidad }];
  guardar(nuevos);
  return nuevos;
}

export function cambiarCantidad(productoId: string, cantidad: number) {
  const items = leer();
  const otros = unidades(items.filter((i) => i.productoId !== productoId));
  const tope = Math.min(cantidad, MAX_UNIDADES_POR_PEDIDO - otros);
  guardar(
    tope <= 0
      ? items.filter((i) => i.productoId !== productoId)
      : items.map((i) => (i.productoId === productoId ? { ...i, cantidad: tope } : i)),
  );
}

export function vaciar() {
  guardar([]);
}
