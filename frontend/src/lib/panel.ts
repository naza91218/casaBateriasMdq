import 'server-only';
import type { EstadoPedido, MedioPago } from '@casa/shared';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ErrorApi, pedir } from './api';

/**
 * Lecturas del panel desde el servidor de Next: reenvía la cookie de sesión del navegador y
 * nunca usa la caché (cada pantalla muestra el estado del momento). Sin sesión, al ingreso.
 */
export async function pedirPanel<T>(ruta: string): Promise<T> {
  const sesion = (await cookies()).get('sesion')?.value;
  if (!sesion) redirect('/panel/ingresar');
  try {
    return await pedir<T>(ruta, { sinCache: true, cookie: `sesion=${sesion}` });
  } catch (e) {
    if (e instanceof ErrorApi && e.estado === 401) redirect('/panel/ingresar');
    throw e;
  }
}

export const ESTADOS: Record<EstadoPedido, string> = {
  pendiente_pago: 'Pendiente de pago',
  a_pagar_en_local: 'A pagar en el local',
  pagado: 'Pagado',
  en_camino: 'En camino',
  listo_para_retirar: 'Listo para retirar',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

export const MEDIOS: Record<MedioPago, string> = {
  mercadopago: 'Mercado Pago',
  transferencia: 'Transferencia',
  efectivo: 'Efectivo',
};

export const fechaCorta = (iso: string) =>
  new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date(iso));
