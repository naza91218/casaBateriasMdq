'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

/** Botón para copiar el alias, el CBU o el monto (gente grande en el celular: nada de tipear). */
export function Copiar({ texto, que }: { texto: string; que: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2500);
        } catch {
          // Sin permiso para el portapapeles: el dato queda a la vista para copiarlo a mano.
        }
      }}
      aria-label={copiado ? `${que} copiado` : `Copiar ${que}`}
      className="inline-flex min-h-11 flex-none items-center gap-1.5 rounded-sm border-2 border-negro px-3 font-semibold transition-colors duration-150 hover:bg-negro hover:text-blanco"
    >
      {copiado ? <Check aria-hidden size={18} strokeWidth={3} /> : <Copy aria-hidden size={18} />}
      <span aria-live="polite">{copiado ? 'Copiado' : 'Copiar'}</span>
    </button>
  );
}
