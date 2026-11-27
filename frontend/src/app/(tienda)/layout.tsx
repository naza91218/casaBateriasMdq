import { Analitica } from '@/components/Analitica';
import { Encabezado } from '@/components/Encabezado';
import { Pie } from '@/components/Pie';
import { WhatsappFlotante } from '@/components/WhatsappFlotante';
import { api, intentar } from '@/lib/api';
import { comercioJsonLd, comoJson } from '@/lib/datos-estructurados';
import { datosTienda, whatsappDe } from '@/lib/tienda';

export default async function LayoutTienda({ children }: { children: React.ReactNode }) {
  const [datos, config] = await Promise.all([datosTienda(), intentar(api.configuracion())]);
  const whatsappUrl = whatsappDe(datos);
  return (
    <>
      {config && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: comoJson(comercioJsonLd(config)) }}
        />
      )}
      <Encabezado whatsappUrl={whatsappUrl} />
      <main id="contenido">{children}</main>
      <Pie datos={datos} whatsappUrl={whatsappUrl} />
      <WhatsappFlotante url={whatsappUrl} />
      <Analitica />
    </>
  );
}
