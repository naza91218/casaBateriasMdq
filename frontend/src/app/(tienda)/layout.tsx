import { Encabezado } from '@/components/Encabezado';
import { Pie } from '@/components/Pie';
import { WhatsappFlotante } from '@/components/WhatsappFlotante';
import { datosTienda, whatsappDe } from '@/lib/tienda';

export default async function LayoutTienda({ children }: { children: React.ReactNode }) {
  const datos = await datosTienda();
  const whatsappUrl = whatsappDe(datos);
  return (
    <>
      <Encabezado whatsappUrl={whatsappUrl} />
      <main id="contenido">{children}</main>
      <Pie datos={datos} whatsappUrl={whatsappUrl} />
      <WhatsappFlotante url={whatsappUrl} />
    </>
  );
}
