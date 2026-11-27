import { Zap } from 'lucide-react';

const FRASES = [
  'Colocación incluida',
  '45 años en Mar del Plata',
  'Hasta 18 meses de garantía',
  'Medimos el alternador',
];

/** Una vuelta de frases separadas por rayos. Se repite para que la fila nunca quede corta. */
function Fila({ className }: { className: string }) {
  const vuelta = [...FRASES, ...FRASES, ...FRASES];
  return (
    <p className={`franja-fila flex w-max gap-8 whitespace-nowrap md:gap-12 ${className}`}>
      {vuelta.map((frase, i) => (
        <span key={i} className="flex items-center gap-8 md:gap-12">
          {frase}
          <Zap aria-hidden className="size-[0.55em] fill-naranja text-naranja" strokeWidth={0} />
        </span>
      ))}
    </p>
  );
}

/**
 * Franja de texto gigante entre secciones: dos filas que se deslizan en sentidos opuestos a
 * medida que se hace scroll (ver .franja en globals.css). Es decorativa: lo que dice ya está en
 * la página, por eso no la leen los lectores de pantalla.
 */
export function Franja() {
  return (
    <div aria-hidden className="franja overflow-clip py-10 text-blanco md:py-14">
      <Fila className="franja-izq titular text-[56px] leading-none md:text-[112px]" />
      <Fila className="franja-der titular franja-hueca mt-2 text-[56px] leading-none md:mt-4 md:text-[112px]" />
    </div>
  );
}
