'use client';

import type { RespuestaArrepentimiento } from '@casa/shared';
import { useState, type FormEvent } from 'react';
import { enviar, ErrorApi } from '@/lib/api';
import { Aviso, CampoPanel } from '../panel/Formulario';

/** Formulario del botón de arrepentimiento (FR-058): devuelve un código de seguimiento. */
export function FormArrepentimiento() {
  const [d, setD] = useState({ numeroPedido: '', nombre: '', email: '' });
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function mandar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErrores({});
    setError(null);
    try {
      const r = await enviar<RespuestaArrepentimiento>('/arrepentimiento', d);
      setCodigo(r.codigo);
    } catch (err) {
      if (err instanceof ErrorApi && Object.keys(err.campos).length) setErrores(err.campos);
      else
        setError(
          err instanceof ErrorApi && err.estado < 500
            ? err.message
            : 'No se pudo mandar. Probá de nuevo o escribinos por WhatsApp.',
        );
    } finally {
      setEnviando(false);
    }
  }

  if (codigo)
    return (
      <div role="status" className="mt-8 rounded-md border-2 border-negro p-6">
        <h2 className="text-[22px] font-bold">Recibimos tu pedido de arrepentimiento</h2>
        <p className="mt-2">Tu código de seguimiento es</p>
        <p className="num mt-1 text-[32px] font-bold">{codigo}</p>
        <p className="mt-2">Te lo mandamos también por mail. Te escribimos en estos días.</p>
      </div>
    );

  const set = (k: keyof typeof d) => (e: { target: { value: string } }) =>
    setD((x) => ({ ...x, [k]: e.target.value }));
  return (
    <form onSubmit={mandar} noValidate className="mt-8 flex flex-col gap-5">
      <CampoPanel
        id="numeroPedido"
        rotulo="Número de pedido"
        ayuda="Está en el mail de tu compra."
        inputMode="numeric"
        value={d.numeroPedido}
        onChange={set('numeroPedido')}
        error={errores.numeroPedido}
      />
      <CampoPanel
        id="nombre"
        rotulo="Nombre y apellido"
        autoComplete="name"
        value={d.nombre}
        onChange={set('nombre')}
        error={errores.nombre}
      />
      <CampoPanel
        id="email"
        rotulo="Mail"
        type="email"
        autoComplete="email"
        value={d.email}
        onChange={set('email')}
        error={errores.email}
      />
      {error && <Aviso tipo="error">{error}</Aviso>}
      <button
        type="submit"
        disabled={enviando}
        className="boton boton-rojo w-full md:w-fit disabled:opacity-70"
      >
        {enviando ? 'Mandando…' : 'Quiero arrepentirme'}
      </button>
    </form>
  );
}
