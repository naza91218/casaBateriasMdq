import { Buscador } from '@/components/portada/Buscador';
import { Franja } from '@/components/portada/Franja';
import { Hero } from '@/components/portada/Hero';
import {
  Beneficios,
  Cierre,
  Gamas,
  Historia,
  Marcas,
  Pagos,
  Pasos,
} from '@/components/portada/Secciones';
import { api, intentar } from '@/lib/api';
import { datosTienda, whatsappDe } from '@/lib/tienda';

export default async function Portada() {
  const [datos, marcas] = await Promise.all([datosTienda(), intentar(api.marcas())]);
  const whatsappUrl = whatsappDe(datos);
  return (
    <>
      <Hero whatsappUrl={whatsappUrl} />
      {/* El buscador se monta sobre el borde del hero: la acción se ve desde el primer vistazo. */}
      <section
        aria-label="Buscador por auto"
        className="relative z-10 -mt-24 px-4 md:-mt-28 md:px-12"
      >
        <Buscador marcas={marcas} whatsapp={datos.whatsapp} />
      </section>
      <Beneficios />
      <Marcas />
      <Pasos />
      <Franja />
      <Gamas whatsappUrl={whatsappUrl} />
      <Historia />
      <Pagos descuentoPct={datos.descuentoPct} />
      <Cierre whatsappUrl={whatsappUrl} domicilio={datos.domicilio} horarios={datos.horarios} />
    </>
  );
}
