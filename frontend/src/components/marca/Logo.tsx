import Link from 'next/link';

/** Isotipo CB en degradé con el nombre ("Casa" y "Baterías" en rojo). */
export function Logo({
  tono = 'claro',
  grande = false,
}: {
  tono?: 'claro' | 'oscuro';
  grande?: boolean;
}) {
  return (
    <Link
      href="/"
      aria-label="La Casa de las Baterías, inicio"
      className="flex flex-none items-center gap-2.5 rounded-sm no-underline"
    >
      {/* SVG de 1,5 KB: no necesita next/image. */}
      <img
        src="/marca/isotipo.svg"
        alt=""
        width={520}
        height={328}
        className={grande ? 'h-12 w-auto' : 'h-8 w-auto md:h-9'}
      />
      <span
        className={`marca ${tono === 'claro' ? 'text-negro' : 'text-blanco'} ${grande ? 'text-[22px]' : 'text-[16px] md:text-[18px]'}`}
      >
        La <span className="text-rojo">Casa</span> de las
        <br />
        <span className="text-rojo">Baterías</span>
      </span>
    </Link>
  );
}
