import Link from 'next/link';
import type { DatosTienda } from '@/lib/tienda';
import { Logo } from './marca/Logo';

const columna =
  'mb-3.5 text-[15px] leading-none font-bold tracking-[0.06em] text-naranja uppercase';
const enlace =
  'block w-fit rounded-sm text-base leading-[1.9] font-medium text-blanco no-underline transition-colors duration-200 hover:text-naranja';

export function Pie({ datos, whatsappUrl }: { datos: DatosTienda; whatsappUrl: string }) {
  return (
    <footer id="contacto" className="oscuro bg-negro text-blanco">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 pt-16 pb-10 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:px-12 md:pt-[72px]">
        <div>
          <Logo tono="oscuro" grande />
          <p className="mt-5 text-base leading-[1.7] text-gris-300">
            {datos.domicilio}
            <br />
            {datos.horarios.length ? (
              datos.horarios.map((h) => (
                <span key={h} className="block">
                  {h}
                </span>
              ))
            ) : (
              <span>[Horarios de atención]</span>
            )}
          </p>
        </div>
        <div>
          <h2 className={columna}>Tienda</h2>
          <Link className={enlace} href="/#buscador">
            Buscar por auto
          </Link>
          <Link className={enlace} href="/buscar">
            Todas las baterías
          </Link>
          <Link className={enlace} href="/#historia">
            Quiénes somos
          </Link>
        </div>
        <div>
          <h2 className={columna}>Contacto</h2>
          <a className={enlace} href={whatsappUrl}>
            {datos.whatsapp ? 'Escribinos por WhatsApp' : 'WhatsApp [número]'}
          </a>
          {datos.telefono ? (
            <a className={`${enlace} num`} href={`tel:${datos.telefono.replace(/\s/g, '')}`}>
              {datos.telefono}
            </a>
          ) : null}
          <a
            className={enlace}
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(datos.domicilio)}`}
          >
            Cómo llegar
          </a>
        </div>
        <div>
          <h2 className={columna}>Legales</h2>
          <Link className={enlace} href="/legales/terminos">
            Términos y condiciones
          </Link>
          <Link className={enlace} href="/legales/privacidad">
            Privacidad
          </Link>
          <Link className={enlace} href="/legales/garantia">
            Cambios y garantía
          </Link>
          <Link
            className="boton boton-fantasma mt-3.5 !min-h-12 !px-[18px] !text-base"
            href="/arrepentimiento"
          >
            Botón de arrepentimiento
          </Link>
        </div>
      </div>
      <div className="mx-auto max-w-[1200px] px-4 pb-8 md:px-12">
        <p className="border-t border-gris-800 pt-6 text-sm text-gris-400">
          © La Casa de las Baterías · {datos.razonSocial ?? '[Razón social]'} · CUIT{' '}
          <span className="num">{datos.cuit ?? '[número]'}</span> · Mar del Plata
        </p>
      </div>
    </footer>
  );
}
