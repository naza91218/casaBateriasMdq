import type { ConfiguracionAdmin, ZonaAdmin } from '@casa/shared';
import { FormConfiguracion } from '@/components/panel/FormConfiguracion';
import { Zonas } from '@/components/panel/Zonas';
import { pedirPanel } from '@/lib/panel';

export const metadata = { title: 'Configuración' };

export default async function Configuracion() {
  const [config, zonas] = await Promise.all([
    pedirPanel<ConfiguracionAdmin>('/admin/configuracion'),
    pedirPanel<ZonaAdmin[]>('/admin/zonas'),
  ]);
  return (
    <>
      <h1 className="text-[32px] leading-tight font-bold">Configuración</h1>
      <div className="mt-6 grid max-w-[1000px] gap-5">
        <Zonas zonas={zonas} />
        <FormConfiguracion inicial={config} />
      </div>
    </>
  );
}
