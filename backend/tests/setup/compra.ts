import type { SolicitudPedido } from '@casa/shared';
import { eq } from 'drizzle-orm';
import { sembrarBase } from '../../db/seed/base.js';
import { sembrarCatalogo } from '../../db/seed/catalogo.js';
import type { PasarelaFalsa } from '../../src/adapters/mercadopago.js';
import { productos } from '../../src/modules/catalogo/infrastructure/schema.js';
import { zonasColocacion } from '../../src/modules/entregas/infrastructure/schema.js';
import { crearProducto } from './fixtures.js';
import { crearContextoDePrueba, prepararBase, type ContextoDePrueba } from './contexto.js';

export const COMPRADOR = {
  nombre: 'Laura Pérez',
  dni: '30123456',
  telefono: '223 512 3456',
  email: 'laura@tienda.test',
  calle: 'Colón',
  numero: '1234',
  referencias: 'Portón negro',
};

export interface EscenarioCompra extends ContextoDePrueba {
  pasarela: PasarelaFalsa;
  zonaMdp: string;
  productoId: string;
}

/** Base limpia con catálogo, una zona "Mar del Plata" y un producto de $100.000 con stock 5. */
export async function prepararCompra(): Promise<EscenarioCompra> {
  await prepararBase();
  const p = crearContextoDePrueba();
  await sembrarBase(p.ctx.db, { mailAdmin: 'admin@tienda.test' });
  await sembrarCatalogo(p.ctx.db);
  const [zona] = await p.ctx.db.select().from(zonasColocacion).where(eq(zonasColocacion.nombre, 'Mar del Plata'));
  const producto = await crearProducto(p.ctx.db, { marca: 'Sermat', medida: '12x65', gama: 'economica', precio: 100_000, stock: 5 });
  return { ...p, pasarela: p.ctx.pasarela as PasarelaFalsa, zonaMdp: zona?.id ?? '', productoId: producto.id };
}

export function solicitud(e: EscenarioCompra, cambios: Partial<SolicitudPedido> = {}): SolicitudPedido {
  return {
    items: [{ productoId: e.productoId, cantidad: 1 }],
    entrega: 'retiro',
    medioPago: 'transferencia',
    comprador: { ...COMPRADOR },
    ...cambios,
  };
}

export async function stockDe(e: EscenarioCompra, productoId: string): Promise<number> {
  const [p] = await e.ctx.db.select({ stock: productos.stock }).from(productos).where(eq(productos.id, productoId));
  return p?.stock ?? -1;
}
