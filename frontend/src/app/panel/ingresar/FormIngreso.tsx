'use client';

import { CircleAlert, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { enviar, ErrorApi } from '@/lib/api';

const CAMPO =
  'mt-2 h-[60px] w-full rounded-sm border-2 bg-blanco px-4 text-[18px] font-semibold focus-visible:border-negro focus-visible:outline-none';

/**
 * Ingreso al panel: mail y contraseña. El enlace por mail queda para la primera vez (todavía no
 * hay contraseña) y para cuando se olvida.
 */
export function FormIngreso({ conEnlace = false }: { conEnlace?: boolean }) {
  const router = useRouter();
  const [modo, setModo] = useState<'clave' | 'enlace'>(conEnlace ? 'enlace' : 'clave');
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [estado, setEstado] = useState<'listo' | 'enviando' | 'enviado'>('listo');
  const [error, setError] = useState<string | null>(null);

  const mensajeDe = (err: unknown, porDefecto: string) =>
    err instanceof ErrorApi && err.estado === 429
      ? 'Hiciste muchos intentos seguidos. Esperá un minuto y probá de nuevo.'
      : err instanceof ErrorApi && err.estado < 500
        ? (Object.values(err.campos)[0] ?? err.message)
        : porDefecto;

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setEstado('enviando');
    setError(null);
    try {
      await enviar('/auth/ingresar', { email, clave });
      router.replace('/panel');
      router.refresh();
    } catch (err) {
      setEstado('listo');
      setError(mensajeDe(err, 'No pudimos entrar. Probá de nuevo en un momento.'));
    }
  }

  async function pedirEnlace(e: FormEvent) {
    e.preventDefault();
    setEstado('enviando');
    setError(null);
    try {
      await enviar('/auth/enlace', { email });
      setEstado('enviado');
    } catch (err) {
      setEstado('listo');
      setError(mensajeDe(err, 'No pudimos mandar el enlace. Probá de nuevo en un momento.'));
    }
  }

  const cambiarModo = (m: 'clave' | 'enlace') => {
    setModo(m);
    setError(null);
    setEstado('listo');
  };

  if (estado === 'enviado') {
    return (
      <div role="status" className="mt-6 rounded-sm bg-gris-100 p-4">
        <p className="flex items-center gap-2 font-bold">
          <Mail aria-hidden size={22} />
          Revisá tu mail
        </p>
        <p className="mt-1">
          Si {email} está autorizado, te llegó un enlace para entrar. Puede tardar un minuto. Una
          vez adentro, en Configuración podés poner tu contraseña.
        </p>
        <button
          type="button"
          onClick={() => cambiarModo('clave')}
          className="mt-3 min-h-11 font-semibold text-rojo-texto underline"
        >
          Volver al ingreso con contraseña
        </button>
      </div>
    );
  }

  const mensajeError = error && (
    <p id="ingreso-error" role="alert" className="mt-3 flex gap-1.5 font-semibold text-rojo-texto">
      <CircleAlert aria-hidden size={18} className="mt-0.5 flex-none" />
      {error}
    </p>
  );
  const borde = error ? 'border-rojo-texto' : 'border-gris-300';

  return (
    <form onSubmit={modo === 'clave' ? entrar : pedirEnlace} noValidate className="mt-6">
      <label htmlFor="email" className="block text-[17px] font-bold">
        Mail
      </label>
      <input
        id="email"
        type="email"
        autoComplete="username"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? 'ingreso-error' : undefined}
        className={`${CAMPO} ${borde}`}
      />

      {modo === 'clave' && (
        <>
          <label htmlFor="clave" className="mt-4 block text-[17px] font-bold">
            Contraseña
          </label>
          <input
            id="clave"
            type="password"
            autoComplete="current-password"
            required
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'ingreso-error' : undefined}
            className={`${CAMPO} ${borde}`}
          />
        </>
      )}

      {mensajeError}

      <button
        type="submit"
        disabled={estado === 'enviando'}
        className="boton boton-rojo mt-5 w-full disabled:opacity-70"
      >
        {estado === 'enviando'
          ? modo === 'clave'
            ? 'Entrando…'
            : 'Mandando…'
          : modo === 'clave'
            ? 'Entrar'
            : 'Mandarme el enlace'}
      </button>

      <button
        type="button"
        onClick={() => cambiarModo(modo === 'clave' ? 'enlace' : 'clave')}
        className="mt-4 min-h-11 w-full text-center font-semibold text-rojo-texto underline"
      >
        {modo === 'clave'
          ? 'Primera vez u olvidaste la contraseña: entrá con un enlace por mail'
          : 'Entrar con contraseña'}
      </button>
    </form>
  );
}
