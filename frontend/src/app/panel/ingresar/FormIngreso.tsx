'use client';

import { CircleAlert, Mail } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { enviar, ErrorApi } from '@/lib/api';

export function FormIngreso() {
  const [email, setEmail] = useState('');
  const [estado, setEstado] = useState<'listo' | 'enviando' | 'enviado'>('listo');
  const [error, setError] = useState<string | null>(null);

  async function pedirEnlace(e: FormEvent) {
    e.preventDefault();
    setEstado('enviando');
    setError(null);
    try {
      await enviar('/auth/enlace', { email });
      setEstado('enviado');
    } catch (err) {
      setEstado('listo');
      setError(
        err instanceof ErrorApi && err.estado === 429
          ? 'Pediste muchos enlaces seguidos. Esperá un minuto y probá de nuevo.'
          : err instanceof ErrorApi && err.estado < 500
            ? (Object.values(err.campos)[0] ?? err.message)
            : 'No pudimos mandar el enlace. Probá de nuevo en un momento.',
      );
    }
  }

  if (estado === 'enviado') {
    return (
      <div role="status" className="mt-6 rounded-sm bg-gris-100 p-4">
        <p className="flex items-center gap-2 font-bold">
          <Mail aria-hidden size={22} />
          Revisá tu mail
        </p>
        <p className="mt-1">
          Si {email} está autorizado, te llegó un enlace para entrar. Puede tardar un minuto.
        </p>
        <button
          type="button"
          onClick={() => setEstado('listo')}
          className="mt-3 min-h-11 font-semibold text-rojo-texto underline"
        >
          Usar otro mail
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={pedirEnlace} noValidate className="mt-6">
      <label htmlFor="email" className="block text-[17px] font-bold">
        Mail
      </label>
      <input
        id="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? 'email-error' : undefined}
        className={`mt-2 h-[60px] w-full rounded-sm border-2 bg-blanco px-4 text-[18px] font-semibold focus-visible:border-negro focus-visible:outline-none ${error ? 'border-rojo-texto' : 'border-gris-300'}`}
      />
      {error && (
        <p
          id="email-error"
          role="alert"
          className="mt-1.5 flex gap-1.5 font-semibold text-rojo-texto"
        >
          <CircleAlert aria-hidden size={18} className="mt-0.5 flex-none" />
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={estado === 'enviando'}
        className="boton boton-rojo mt-5 w-full disabled:opacity-70"
      >
        {estado === 'enviando' ? 'Mandando…' : 'Mandarme el enlace'}
      </button>
    </form>
  );
}
