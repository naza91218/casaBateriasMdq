import { Importar } from '@/components/panel/Importar';

export const metadata = { title: 'Importar planilla' };

export default function PaginaImportar() {
  return (
    <>
      <h1 className="text-[32px] leading-tight font-bold">Importar planilla</h1>
      <p className="mt-1 mb-6 max-w-[70ch] text-gris-600">
        Cargá o actualizá muchos productos o autos de una vez. Las filas con error no se cargan y te
        decimos por qué; el resto sí.
      </p>
      <Importar />
    </>
  );
}
