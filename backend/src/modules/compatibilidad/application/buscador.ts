import type { OpcionVehiculo, ResultadoCompatibles } from '@casa/shared';
import { desdeSlug } from '../../../shared-kernel/slug.js';
import { enlaceWhatsapp, mensajes } from '../../../shared-kernel/whatsapp.js';
import type { ServicioCatalogo } from '../../catalogo/application/catalogo.js';
import { ORDEN_GAMA } from '../../catalogo/domain/precios.js';
import type { ServicioConfiguracion } from '../../configuracion/application/configuracion.js';
import type { RepositorioCompatibilidad } from '../infrastructure/repositorio.js';

/**
 * Buscador por auto: marca → modelo → año → baterías de las medidas compatibles (US1).
 * El auto lleva a la batería: el comprador nunca tiene que saber medidas.
 */
export class ServicioBuscador {
  constructor(
    private readonly repo: RepositorioCompatibilidad,
    private readonly catalogo: ServicioCatalogo,
    private readonly configuracion: ServicioConfiguracion,
  ) {}

  marcas(): Promise<OpcionVehiculo[]> {
    return this.repo.marcas();
  }

  modelos(marcaSlug: string): Promise<OpcionVehiculo[]> {
    return this.repo.modelos(marcaSlug);
  }

  /** Años cubiertos por algún rango cargado, del más nuevo al más viejo. */
  async anios(marcaSlug: string, modeloSlug: string): Promise<number[]> {
    const anios = new Set<number>();
    for (const r of await this.repo.rangos(marcaSlug, modeloSlug)) {
      for (let a = r.desde; a <= r.hasta; a++) anios.add(a);
    }
    return [...anios].sort((a, b) => b - a);
  }

  async compatibles(marcaSlug: string, modeloSlug: string, anio: number): Promise<ResultadoCompatibles> {
    const [filas, config] = await Promise.all([
      this.repo.vehiculosEnAnio(marcaSlug, modeloSlug, anio),
      this.configuracion.obtener(),
    ]);
    const marca = filas[0]?.marca ?? desdeSlug(marcaSlug);
    const modelo = filas[0]?.modelo ?? desdeSlug(modeloSlug);
    const whatsapp = enlaceWhatsapp(config.whatsapp, mensajes.buscoAuto(marca, modelo, anio));
    const vehiculo = { marca, modelo, anio };

    if (filas.length === 0) {
      return { vehiculo, medidas: [], grupos: [], sinResultados: 'auto_no_cargado', whatsapp };
    }

    const medidas = [...new Set(filas.map((f) => f.medida))];
    const productos = await this.catalogo.productosDeMedidas(medidas);
    const ordenMedidas = (await this.catalogo.medidas()).map((m) => m.codigo);
    medidas.sort((a, b) => ordenMedidas.indexOf(a) - ordenMedidas.indexOf(b));

    const grupos = ORDEN_GAMA.map((gama) => ({
      gama,
      productos: productos.filter((p) => p.gama === gama),
    })).filter((g) => g.productos.length > 0);

    return {
      vehiculo,
      medidas,
      grupos,
      sinResultados: grupos.length === 0 ? 'sin_stock' : null,
      whatsapp,
    };
  }
}
