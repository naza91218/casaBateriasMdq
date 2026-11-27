import { indiceSeo, PAGINAS_FIJAS } from '@/lib/seo';
import { NOMBRE, SITIO } from '@/lib/sitio';
import { datosTienda } from '@/lib/tienda';

export const revalidate = 3600;

/** Resumen del negocio y sus páginas clave para modelos de lenguaje (FR-074, llmstxt.org). */
export async function GET() {
  const [d, { modelos }] = await Promise.all([datosTienda(), indiceSeo()]);
  const lineas = [
    `# ${NOMBRE}`,
    '',
    `> Venta y colocación de baterías para autos en Mar del Plata, hace 45 años. Colocación incluida, garantía de 18 meses en Sermat y 12 en las demás marcas. ${d.domicilio}.`,
    '',
    ...(d.horarios.length ? [`Horarios: ${d.horarios.join('; ')}.`] : []),
    ...(d.telefono ? [`Teléfono: ${d.telefono}.`] : []),
    ...(d.whatsapp ? [`WhatsApp: https://wa.me/${d.whatsapp.replace(/\D/g, '')}`] : []),
    'Formas de pago: Mercado Pago, transferencia o efectivo en el local.',
    '',
    '## Páginas',
    '',
    ...PAGINAS_FIJAS.map((p) => `- [${p.titulo}](${SITIO}${p.ruta})`),
    '',
    '## Qué batería lleva cada auto',
    '',
    ...modelos.map(
      (m) =>
        `- [${m.marca.nombre} ${m.modelo.nombre}](${SITIO}/auto/${m.marca.slug}/${m.modelo.slug})`,
    ),
    '',
  ];
  return new Response(lineas.join('\n'), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}
