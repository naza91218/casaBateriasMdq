import type { CSSProperties } from 'react';

/**
 * Parte un texto en palabras que suben desde una ranura (ver .palabra en globals.css). El
 * titular que las contiene decide cuándo: `.al-cargar` (el hero) o `.en-vista` (al llegar con el
 * scroll). `desde` continúa la cuenta del escalonado cuando un titular tiene varios tramos.
 */
export function Palabras({
  texto,
  desde = 0,
  className,
}: {
  texto: string;
  desde?: number;
  className?: string;
}) {
  const palabras = texto.trim().split(/\s+/);
  return (
    <span className={className}>
      {palabras.map((p, i) => (
        <span key={i}>
          <span className="palabra">
            <span style={{ '--i': desde + i } as CSSProperties}>{p}</span>
          </span>
          {i < palabras.length - 1 ? ' ' : ''}
        </span>
      ))}
    </span>
  );
}
