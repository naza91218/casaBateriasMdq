'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { enviar } from '@/lib/api';

export function MarcarCanje({ id, estado }: { id: string; estado: 'pendiente' | 'atendida' }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const otro = estado === 'pendiente' ? 'atendida' : 'pendiente';
  return (
    <button
      type="button"
      disabled={enviando}
      onClick={async () => {
        setEnviando(true);
        await enviar(`/admin/consultas-canje/${id}`, { estado: otro }, undefined, 'PATCH').catch(
          () => null,
        );
        setEnviando(false);
        router.refresh();
      }}
      className={`boton !min-h-11 !px-4 !text-[16px] ${estado === 'pendiente' ? 'boton-negro' : 'boton-borde'}`}
    >
      {enviando ? 'Guardando…' : estado === 'pendiente' ? 'Marcar atendida' : 'Volver a pendiente'}
    </button>
  );
}
