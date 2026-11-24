import Image from 'next/image';

/**
 * Las dos fotos del frente del local, superpuestas. Al llegar con el scroll la principal se
 * descubre como una persiana y la segunda cae girando encima; después se mueven a distinta
 * velocidad (ver .fotos-local en globals.css). Sin soporte o con menos movimiento: quietas.
 */
export function FotosLocal({ className = '' }: { className?: string }) {
  return (
    <div className={`fotos-local relative pb-[24%] ${className}`}>
      <figure className="fl-principal ml-auto w-[90%]">
        <div className="fl-cortina overflow-clip rounded-md shadow-[0_24px_60px_-20px_rgb(0_0_0/0.55)]">
          <Image
            src="/local/frente.webp"
            alt="Frente del local de La Casa de las Baterías, con la vidriera llena de baterías"
            width={1376}
            height={768}
            sizes="(width >= 768px) 620px, 90vw"
            className="fl-zoom h-auto w-full"
          />
        </div>
      </figure>
      <figure className="fl-segunda absolute bottom-0 left-0 w-[58%]">
        <div className="fl-cae overflow-clip rounded-md border-[6px] border-blanco shadow-[0_30px_60px_-18px_rgb(0_0_0/0.6)]">
          <Image
            src="/local/frente-angulo.webp"
            alt="Vidriera del local vista desde la vereda, con los carteles de Baterías"
            width={1600}
            height={961}
            sizes="(width >= 768px) 400px, 58vw"
            className="h-auto w-full"
          />
        </div>
      </figure>
    </div>
  );
}
