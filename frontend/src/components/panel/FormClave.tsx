'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { enviar, ErrorApi } from '@/lib/api';
import { Aviso, CampoPanel, Tarjeta } from './Formulario';

const LARGO_MINIMO = 10;

/**
 * Poner o cambiar la contraseña del panel. La primera vez (se entró con el enlace por mail) no
 * pide la actual. Al cambiarla se cierran las sesiones abiertas en otros dispositivos.
 */
export function FormClave({ tieneClave }: { tieneClave: boolean }) {
  const router = useRouter();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetida, setRepetida] = useState('');
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setAviso(null);
    const locales: Record<string, string> = {};
    if (nueva.length < LARGO_MINIMO) locales.nueva = `Al menos ${LARGO_MINIMO} caracteres`;
    else if (nueva !== repetida) locales.repetida = 'No coincide con la nueva';
    setErrores(locales);
    if (Object.keys(locales).length) return;

    setEnviando(true);
    try {
      await enviar('/auth/clave', { ...(tieneClave ? { actual } : {}), nueva });
      setActual('');
      setNueva('');
      setRepetida('');
      setAviso({
        tipo: 'ok',
        texto: tieneClave
          ? 'Listo, cambiaste la contraseña. Se cerró la sesión en los otros dispositivos.'
          : 'Listo. Desde ahora entrás con tu mail y esta contraseña.',
      });
      router.refresh();
    } catch (err) {
      if (err instanceof ErrorApi && err.estado < 500) {
        setErrores(err.campos);
        setAviso({ tipo: 'error', texto: err.message });
      } else {
        setAviso({ tipo: 'error', texto: 'No pudimos guardarla. Probá de nuevo en un momento.' });
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Tarjeta titulo={tieneClave ? 'Tu contraseña' : 'Poné tu contraseña'}>
      <form onSubmit={guardar} noValidate className="grid gap-4">
        {!tieneClave && (
          <p className="text-gris-600">
            Entraste con un enlace por mail. Poné una contraseña para entrar directo la próxima vez.
          </p>
        )}
        <div className="grid gap-4 md:grid-cols-3">
          {tieneClave && (
            <CampoPanel
              id="clave-actual"
              rotulo="Contraseña actual"
              type="password"
              autoComplete="current-password"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              error={errores.actual}
            />
          )}
          <CampoPanel
            id="clave-nueva"
            rotulo="Contraseña nueva"
            ayuda={`Al menos ${LARGO_MINIMO} caracteres`}
            type="password"
            autoComplete="new-password"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            error={errores.nueva}
          />
          <CampoPanel
            id="clave-repetida"
            rotulo="Repetila"
            type="password"
            autoComplete="new-password"
            value={repetida}
            onChange={(e) => setRepetida(e.target.value)}
            error={errores.repetida}
          />
        </div>
        {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}
        <div>
          <button
            type="submit"
            disabled={enviando}
            className="boton boton-rojo disabled:opacity-70"
          >
            {enviando ? 'Guardando…' : tieneClave ? 'Cambiar contraseña' : 'Guardar contraseña'}
          </button>
        </div>
      </form>
    </Tarjeta>
  );
}
