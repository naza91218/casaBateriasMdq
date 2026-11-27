import type { ItemProducto, PaginaVehiculo } from '@casa/shared';
import { Dinero } from '../../../shared-kernel/dinero.js';
import { noEncontrado } from '../../../shared-kernel/errores.js';
import { slug } from '../../../shared-kernel/slug.js';
import { enlaceWhatsapp, mensajes } from '../../../shared-kernel/whatsapp.js';
import type { ServicioCatalogo } from '../../catalogo/application/catalogo.js';
import type { ServicioConfiguracion } from '../../configuracion/application/configuracion.js';
import type { ServicioZonas } from '../../entregas/application/zonas.js';
import type { RepositorioCompatibilidad } from '../infrastructure/repositorio.js';
import { agruparPorGama } from './buscador.js';

type Fila = PaginaVehiculo['tabla'][number];

/** "12x65", "12x65 o 12x70", "12x60, 12x65 o 12x70". */
export function listarMedidas(medidas: string[]): string {
  if (medidas.length <= 1) return medidas[0] ?? '';
  return `${medidas.slice(0, -1).join(', ')} o ${medidas.at(-1)}`;
}

/**
 * Igual que el buscador (clarify 2026-10-30): una versión sin años vale para todos los años y una
 * sin motor, para cualquier motor. Así, a cada versión se le suman las medidas de las más generales.
 */
export function medidasEfectivas(
  tabla: Fila[],
  porOrden: (a: string, b: string) => number,
): Fila[] {
  const aplica = (general: Fila, f: Fila) =>
    general !== f &&
    (general.anioDesde === null ||
      (general.anioDesde === f.anioDesde && general.anioHasta === f.anioHasta)) &&
    (general.motor === null || general.motor === f.motor);
  return tabla.map((f) => ({
    ...f,
    medidas: [
      ...new Set([...f.medidas, ...tabla.filter((g) => aplica(g, f)).flatMap((g) => g.medidas)]),
    ].sort(porOrden),
  }));
}

function etiqueta(f: Fila, resto: string): string {
  const partes: string[] = [];
  if (f.anioDesde !== null && f.anioHasta !== null) {
    partes.push(
      f.anioDesde === f.anioHasta ? `en ${f.anioDesde}` : `de ${f.anioDesde} a ${f.anioHasta}`,
    );
  }
  if (f.motor) partes.push(`con motor ${f.motor}`);
  return partes.length ? partes.join(' ') : resto;
}

/**
 * La respuesta directa que encabeza la página y es la primera pregunta frecuente (FR-072,
 * US6-07). Si todas las versiones llevan lo mismo, una sola oración; si no, por año y motor.
 */
export function respuestaMedida(nombre: string, tabla: Fila[]): string {
  const distintas = new Set(tabla.map((f) => f.medidas.join('|')));
  if (distintas.size <= 1)
    return `El ${nombre} lleva una batería ${listarMedidas(tabla[0]?.medidas ?? [])}.`;
  const porAnio = tabla.some((f) => f.anioDesde !== null);
  const porMotor = tabla.some((f) => f.motor);
  const segun = porAnio && porMotor ? 'del año y del motor' : porAnio ? 'del año' : 'del motor';
  const resto =
    porAnio && porMotor
      ? 'en las demás versiones'
      : porAnio
        ? 'en los demás años'
        : 'con los demás motores';
  // La versión general (sin años ni motor) va al final: cubre lo que no dicen las otras.
  const general = (f: Fila) => f.anioDesde === null && !f.motor;
  const ordenadas = [...tabla.filter((f) => !general(f)), ...tabla.filter(general)];
  const casos = ordenadas.map((f) => `${etiqueta(f, resto)}, ${listarMedidas(f.medidas)}`);
  return `La batería del ${nombre} depende ${segun}: ${casos.join('; ')}.`;
}

/**
 * Página de cada modelo de auto (T133): todo lo que el frontend necesita para que Google y los
 * buscadores con IA respondan "¿qué batería lleva?" con los datos de la tienda (FR-053, FR-072).
 */
export class ServicioPaginaVehiculo {
  constructor(
    private readonly repo: RepositorioCompatibilidad,
    private readonly catalogo: ServicioCatalogo,
    private readonly configuracion: ServicioConfiguracion,
    private readonly zonas: ServicioZonas,
  ) {}

  async obtener(marcaSlug: string, modeloSlug: string): Promise<PaginaVehiculo> {
    const filas = await this.repo.filasDelModelo(marcaSlug, modeloSlug);
    const primera = filas[0];
    if (!primera) throw noEncontrado('Todavía no tenemos cargado ese modelo');

    const orden = (await this.catalogo.medidas()).map((m) => m.codigo);
    const porOrden = (a: string, b: string) => orden.indexOf(a) - orden.indexOf(b);

    // Una fila de la tabla por versión del auto (años y motor), con todas sus medidas.
    const versiones = new Map<string, Fila>();
    for (const f of filas) {
      const v = versiones.get(f.id) ?? {
        anioDesde: f.anioDesde,
        anioHasta: f.anioHasta,
        motor: f.motor,
        medidas: [],
      };
      v.medidas.push(f.medida);
      versiones.set(f.id, v);
    }
    const tabla = medidasEfectivas([...versiones.values()], porOrden);
    const medidas = [...new Set(filas.map((f) => f.medida))].sort(porOrden);

    const [productos, config, zonas] = await Promise.all([
      this.catalogo.productosDeMedidas(medidas),
      this.configuracion.obtener(),
      this.zonas.listarActivas(),
    ]);
    const nombre = `${primera.marca} ${primera.modelo}`;
    const respuesta = respuestaMedida(nombre, tabla);
    const otrasZonas = zonas.map((z) => z.nombre).filter((z) => slug(z) !== 'mar-del-plata');
    const actualizadoEn = new Date(Math.max(...filas.map((f) => f.actualizadoEn.getTime())));

    return {
      marca: { nombre: primera.marca, slug: marcaSlug },
      modelo: { nombre: primera.modelo, slug: modeloSlug },
      respuesta,
      medidas,
      tabla,
      grupos: agruparPorGama(productos),
      preguntas: [
        { pregunta: `¿Qué batería lleva el ${nombre}?`, respuesta },
        { pregunta: `¿Cuánto sale la batería para el ${nombre}?`, respuesta: precio(productos) },
        {
          pregunta: '¿Me la colocan a domicilio?',
          respuesta:
            'Sí. La colocación está incluida en Mar del Plata' +
            (otrasZonas.length ? ` y también vamos a ${listarZonas(otrasZonas)}` : '') +
            '. Si preferís, podés retirarla en el local.',
        },
        {
          pregunta: '¿Tiene garantía?',
          respuesta:
            'Sí. Las baterías Sermat tienen 18 meses de garantía y las de las demás marcas, 12 meses, contados desde la colocación. Además, al instalarla controlamos el alternador sin cargo.',
        },
        {
          pregunta: '¿Puedo entregar mi batería usada?',
          respuesta:
            'Sí, en Mar del Plata tomamos tu batería usada como parte de pago. El valor lo definimos al verla: consultanos por WhatsApp.',
        },
      ],
      actualizadoEn: actualizadoEn.toISOString(),
      whatsapp: enlaceWhatsapp(config.whatsapp, mensajes.buscoAuto(primera.marca, primera.modelo)),
    };
  }
}

function precio(productos: ItemProducto[]): string {
  const masBarata = [...productos].sort(
    (a, b) => a.precios.transferenciaOEfectivo - b.precios.transferenciaOEfectivo,
  )[0];
  if (!masBarata) {
    return 'Escribinos por WhatsApp y te decimos el precio y la disponibilidad en el momento.';
  }
  const conDescuento = Dinero.deCentavos(masBarata.precios.transferenciaOEfectivo).aTexto();
  const lista = Dinero.deCentavos(masBarata.precios.lista).aTexto();
  return `Desde ${conDescuento} pagando con transferencia o efectivo (${lista} con Mercado Pago), con la colocación y la medición del alternador incluidas.`;
}

function listarZonas(zonas: string[]): string {
  return zonas.length === 1
    ? (zonas[0] ?? '')
    : `${zonas.slice(0, -1).join(', ')} y ${zonas.at(-1)}`;
}
