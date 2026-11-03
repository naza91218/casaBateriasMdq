'use client';

import type { EstadoPedido, PedidoDetalleAdmin } from '@casa/shared';
import { Banknote, CircleAlert, Landmark, ShieldOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { enviar, ErrorApi } from '@/lib/api';

const NOMBRES: Record<EstadoPedido, string> = {
  pendiente_pago: 'Pendiente de pago',
  a_pagar_en_local: 'A pagar en el local',
  pagado: 'Pagado',
  en_camino: 'En camino',
  listo_para_retirar: 'Listo para retirar',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

type Pendiente =
  | { tipo: 'estado'; a: EstadoPedido }
  | { tipo: 'transferencia' }
  | { tipo: 'efectivo' }
  | { tipo: 'anonimizar' };

/**
 * Acciones del pedido. Toda acción pide confirmación en el mismo lugar (sin ventanas emergentes)
 * y, al terminar, vuelve a leer el pedido del servidor.
 */
export function AccionesPedido({ p }: { p: PedidoDetalleAdmin }) {
  const router = useRouter();
  const [pendiente, setPendiente] = useState<Pendiente | null>(null);
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmarRef = useRef<HTMLDivElement>(null);

  function pedir(a: Pendiente) {
    setPendiente(a);
    setMotivo('');
    setError(null);
    requestAnimationFrame(() => confirmarRef.current?.focus());
  }

  async function ejecutar() {
    if (!pendiente) return;
    setEnviando(true);
    setError(null);
    const base = `/admin/pedidos/${p.id}`;
    try {
      if (pendiente.tipo === 'estado') {
        await enviar(`${base}/estado`, {
          a: pendiente.a,
          ...(motivo.trim() ? { motivo: motivo.trim() } : {}),
        });
      } else if (pendiente.tipo === 'transferencia') {
        await enviar(`${base}/confirmar-transferencia`);
      } else if (pendiente.tipo === 'efectivo') {
        await enviar(`${base}/registrar-efectivo`);
      } else {
        await enviar(`${base}/anonimizar`);
      }
      setPendiente(null);
      router.refresh();
    } catch (e) {
      setError(
        e instanceof ErrorApi && e.estado < 500 ? e.message : 'No se pudo guardar. Probá de nuevo.',
      );
    } finally {
      setEnviando(false);
    }
  }

  const texto = !pendiente
    ? ''
    : pendiente.tipo === 'estado'
      ? `¿Pasar el pedido #${p.numero} a "${NOMBRES[pendiente.a]}"? Al comprador le llega un mail.`
      : pendiente.tipo === 'transferencia'
        ? `¿Confirmás que recibiste la transferencia del pedido #${p.numero}? Queda registrado con tu mail.`
        : pendiente.tipo === 'efectivo'
          ? `¿Confirmás que cobraste en efectivo el pedido #${p.numero}? Queda registrado con tu mail.`
          : `¿Borrar los datos personales del comprador del pedido #${p.numero}? No se puede deshacer.`;

  return (
    <div className="flex flex-col gap-5">
      {(p.acciones.confirmarTransferencia || p.acciones.registrarEfectivo) && (
        <div className="flex flex-col gap-3">
          {p.acciones.confirmarTransferencia && (
            <button
              type="button"
              onClick={() => pedir({ tipo: 'transferencia' })}
              className="boton boton-rojo w-full"
            >
              <Landmark aria-hidden size={22} />
              Confirmar transferencia
            </button>
          )}
          {p.acciones.registrarEfectivo && (
            <button
              type="button"
              onClick={() => pedir({ tipo: 'efectivo' })}
              className="boton boton-rojo w-full"
            >
              <Banknote aria-hidden size={22} />
              Registrar pago en efectivo
            </button>
          )}
        </div>
      )}

      {p.transicionesPermitidas.length > 0 && (
        <div>
          <h3 className="text-[19px] font-bold">Cambiar estado</h3>
          <p className="text-[16px] text-gris-600">
            Al comprador le llega un mail con cada cambio.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {p.transicionesPermitidas.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => pedir({ tipo: 'estado', a })}
                className={`boton !min-h-12 !px-4 !text-[17px] ${a === 'cancelado' ? 'boton-borde !text-rojo-texto' : 'boton-negro'}`}
              >
                {NOMBRES[a]}
              </button>
            ))}
          </div>
        </div>
      )}

      {p.puedeAnonimizar && (
        <button
          type="button"
          onClick={() => pedir({ tipo: 'anonimizar' })}
          className="inline-flex min-h-11 w-fit items-center gap-2 font-semibold text-rojo-texto underline hover:text-negro"
        >
          <ShieldOff aria-hidden size={20} />
          Borrar los datos del comprador
        </button>
      )}

      {pendiente && (
        <div
          ref={confirmarRef}
          tabIndex={-1}
          role="alertdialog"
          aria-labelledby="confirmar-texto"
          className="rounded-md border-2 border-negro bg-blanco p-5 outline-none"
        >
          <p id="confirmar-texto" className="font-semibold">
            {texto}
          </p>
          {pendiente.tipo === 'estado' && (
            <div className="mt-3">
              <label htmlFor="motivo" className="block text-[16px] font-bold">
                Motivo {pendiente.a === 'cancelado' ? '(se le explica al comprador)' : '(opcional)'}
              </label>
              <input
                id="motivo"
                value={motivo}
                maxLength={300}
                onChange={(e) => setMotivo(e.target.value)}
                className="mt-1.5 h-12 w-full rounded-sm border-2 border-gris-300 px-3 focus-visible:border-negro focus-visible:outline-none"
              />
            </div>
          )}
          {error && (
            <p role="alert" className="mt-3 flex gap-1.5 font-semibold text-rojo-texto">
              <CircleAlert aria-hidden size={18} className="mt-0.5 flex-none" />
              {error}
            </p>
          )}
          <div className="mt-4 flex flex-col gap-2 md:flex-row">
            <button
              type="button"
              onClick={ejecutar}
              disabled={enviando}
              className="boton boton-rojo disabled:opacity-70"
            >
              {enviando ? 'Guardando…' : 'Sí, confirmar'}
            </button>
            <button
              type="button"
              onClick={() => setPendiente(null)}
              disabled={enviando}
              className="boton boton-borde"
            >
              No, volver
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Resolver una alerta de pago (FR-031). */
export function ResolverAlerta({ id }: { id: string }) {
  const router = useRouter();
  const [estado, setEstado] = useState<'listo' | 'enviando' | string>('listo');
  return (
    <div>
      <button
        type="button"
        disabled={estado === 'enviando'}
        onClick={async () => {
          setEstado('enviando');
          try {
            await enviar(`/admin/alertas/${id}/resolver`);
            setEstado('listo');
            router.refresh();
          } catch (e) {
            setEstado(
              e instanceof ErrorApi && e.estado < 500
                ? e.message
                : 'No se pudo marcar. Probá de nuevo.',
            );
          }
        }}
        className="boton boton-borde !min-h-11 !px-4 !text-[16px]"
      >
        {estado === 'enviando' ? 'Guardando…' : 'Marcar como resuelta'}
      </button>
      {estado !== 'listo' && estado !== 'enviando' && (
        <p role="alert" className="mt-2 font-semibold text-rojo-texto">
          {estado}
        </p>
      )}
    </div>
  );
}
