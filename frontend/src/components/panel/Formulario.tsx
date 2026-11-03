'use client';

import { CircleAlert } from 'lucide-react';
import type { InputHTMLAttributes, ReactNode } from 'react';

/** Piezas comunes de los formularios del panel: rótulo arriba, ayuda y error debajo. */
export function CampoPanel({
  id,
  rotulo,
  ayuda,
  error,
  ...input
}: {
  id: string;
  rotulo: string;
  ayuda?: string;
  error?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block text-[17px] font-bold">
        {rotulo}
      </label>
      {ayuda && (
        <p id={`${id}-ayuda`} className="text-[15px] text-gris-600">
          {ayuda}
        </p>
      )}
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : ayuda ? `${id}-ayuda` : undefined}
        className={`mt-1.5 h-14 w-full rounded-sm border-2 bg-blanco px-3.5 text-[18px] font-semibold focus-visible:border-negro focus-visible:outline-none disabled:bg-gris-100 disabled:text-gris-600 ${error ? 'border-rojo-texto' : 'border-gris-300 hover:border-gris-600'}`}
        {...input}
      />
      <ErrorPanel id={id} error={error} />
    </div>
  );
}

export function ErrorPanel({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={`${id}-error`} className="mt-1.5 flex gap-1.5 text-[16px] font-semibold text-rojo-texto">
      <CircleAlert aria-hidden size={18} className="mt-0.5 flex-none" />
      {error}
    </p>
  );
}

export function Tarjeta({
  titulo,
  children,
  accion,
}: {
  titulo: string;
  children: ReactNode;
  accion?: ReactNode;
}) {
  return (
    <section className="rounded-md border-2 border-gris-200 bg-blanco p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[21px] font-bold">{titulo}</h2>
        {accion}
      </div>
      {children}
    </section>
  );
}

/** Aviso de guardado o de error general, anunciado al lector de pantalla. */
export function Aviso({ tipo, children }: { tipo: 'ok' | 'error'; children: ReactNode }) {
  return (
    <p
      role={tipo === 'error' ? 'alert' : 'status'}
      className={`rounded-sm border-2 p-3 font-semibold ${tipo === 'error' ? 'border-rojo-texto text-rojo-texto' : 'border-verde-ok text-verde-ok'}`}
    >
      {children}
    </p>
  );
}

/** "1.234,50" o "1234.5" → centavos. Vacío → null. */
export function aCentavos(texto: string): number | null {
  const limpio = texto.trim().replace(/\$|\s/g, '');
  if (!limpio) return null;
  const normal = limpio.includes(',') ? limpio.replace(/\./g, '').replace(',', '.') : limpio;
  const n = Number(normal);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : NaN;
}

export const aPesos = (centavos: number) =>
  (centavos / 100).toLocaleString('es-AR', { maximumFractionDigits: 2 });
