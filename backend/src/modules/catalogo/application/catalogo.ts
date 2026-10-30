import type {
  FichaProducto,
  ItemProducto,
  ListadoProductos,
  MarcaCatalogo,
  Medida,
} from '@casa/shared';
import { noEncontrado } from '../../../shared-kernel/errores.js';
import { Dinero } from '../../../shared-kernel/dinero.js';
import { enlaceWhatsapp, mensajes } from '../../../shared-kernel/whatsapp.js';
import type { ServicioConfiguracion } from '../../configuracion/application/configuracion.js';
import { calcularPrecios, EXPLICACION_GAMA, SERVICIO_INCLUIDO } from '../domain/precios.js';
import type {
  FiltrosListado,
  FilaProducto,
  RepositorioCatalogo,
} from '../infrastructure/repositorio.js';

export interface AutoCompatible {
  marca: string;
  modelo: string;
  anioDesde: number | null;
  anioHasta: number | null;
}

export interface DependenciasCatalogo {
  repo: RepositorioCatalogo;
  configuracion: ServicioConfiguracion;
  urlFoto: (clave: string) => string;
  /** Lo provee el módulo compatibilidad (se inyecta para no crear dependencia circular). */
  autosDeMedida: (medida: string) => Promise<AutoCompatible[]>;
}

/** Catálogo público: solo productos activos, precios calculados en el servidor. */
export class ServicioCatalogo {
  constructor(private readonly d: DependenciasCatalogo) {}

  marcas(): Promise<MarcaCatalogo[]> {
    return this.d.repo.marcasActivas();
  }

  medidas(): Promise<Medida[]> {
    return this.d.repo.medidas();
  }

  async listar(filtros: FiltrosListado): Promise<ListadoProductos> {
    const { filas, total } = await this.d.repo.listarActivos(filtros);
    return {
      items: await this.aItems(filas),
      total,
      pagina: filtros.pagina,
      porPagina: filtros.porPagina,
    };
  }

  /** Productos que el buscador muestra para un auto (activos y con stock). */
  async productosDeMedidas(listaMedidas: string[]): Promise<ItemProducto[]> {
    return this.aItems(await this.d.repo.activosConStockDeMedidas(listaMedidas));
  }

  async obtenerFicha(slug: string): Promise<FichaProducto> {
    const fila = await this.d.repo.activoPorSlug(slug);
    if (!fila) throw noEncontrado('No encontramos esa batería');
    const [item] = await this.aItems([fila]);
    const [fotos, autos, config] = await Promise.all([
      this.d.repo.fotosDe([fila.id]),
      this.d.autosDeMedida(fila.medida),
      this.d.configuracion.obtener(),
    ]);
    if (!item) throw noEncontrado('No encontramos esa batería');
    return {
      ...item,
      descripcion: fila.descripcion,
      fotos: (fotos.get(fila.id) ?? []).map(this.d.urlFoto),
      explicacionGama: EXPLICACION_GAMA[fila.gama],
      servicioIncluido: [...SERVICIO_INCLUIDO],
      autosCompatibles: autos,
      whatsapp: enlaceWhatsapp(config.whatsapp, mensajes.consultaProducto(fila.nombre)),
    };
  }

  private async aItems(filas: FilaProducto[]): Promise<ItemProducto[]> {
    const [config, fotos] = await Promise.all([
      this.d.configuracion.obtener(),
      this.d.repo.fotosDe(filas.map((f) => f.id)),
    ]);
    const descuentoPct = Number(config.descuentoPct);
    return filas.map((f) => {
      const precios = calcularPrecios(Dinero.deCentavos(f.precioLista), descuentoPct);
      const primera = fotos.get(f.id)?.[0];
      return {
        id: f.id,
        slug: f.slug,
        nombre: f.nombre,
        marca: { nombre: f.marcaNombre, slug: f.marcaSlug },
        medida: f.medida,
        gama: f.gama,
        amperajeAh: f.amperajeAh,
        cca: f.cca,
        precios: {
          lista: precios.lista.aNumero(),
          transferenciaOEfectivo: precios.transferenciaOEfectivo.aNumero(),
          descuentoPct,
        },
        foto: primera ? this.d.urlFoto(primera) : null,
        disponible: f.stock > 0,
      };
    });
  }
}
