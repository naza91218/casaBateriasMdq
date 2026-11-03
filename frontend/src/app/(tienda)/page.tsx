import { Buscador } from '@/components/portada/Buscador';
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
      <section aria-label="Buscador por auto" className="bg-gris-100 px-4 py-12 md:px-12 md:py-16">
        <Buscador marcas={marcas} whatsapp={datos.whatsapp} />
      </section>
      <Beneficios />
      <Marcas />
      <Pasos />
      <Gamas whatsappUrl={whatsappUrl} />
      <Historia />
      <Pagos descuentoPct={datos.descuentoPct} />
      <Cierre whatsappUrl={whatsappUrl} />
    </>
  );
}
