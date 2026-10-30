import type { IndiceSeo } from '@casa/shared';
import type { RepositorioCatalogo } from '../infrastructure/repositorio.js';

export interface ModeloIndexable {
  marca: string;
  marcaSlug: string;
  modelo: string;
  modeloSlug: string;
  actualizadoEn: Date | null;
}

/**
 * Lo que el frontend publica en el mapa del sitio y en `llms.txt` (FR-055, FR-074): productos
 * activos y modelos con compatibilidad. Los pausados, a revisar y archivados no aparecen (US6-04).
 */
export class ServicioIndiceSeo {
  constructor(
    private readonly repo: RepositorioCatalogo,
    /** Lo provee el módulo compatibilidad (se inyecta para no crear dependencia circular). */
    private readonly modelos: () => Promise<ModeloIndexable[]>,
  ) {}

  async obtener(): Promise<IndiceSeo> {
    const [productos, modelos] = await Promise.all([this.repo.activosParaIndice(), this.modelos()]);
    return {
      productos: productos.map((p) => ({
        slug: p.slug,
        nombre: p.nombre,
        actualizadoEn: p.actualizadoEn.toISOString(),
      })),
      modelos: modelos.map((m) => ({
        marca: { nombre: m.marca, slug: m.marcaSlug },
        modelo: { nombre: m.modelo, slug: m.modeloSlug },
        actualizadoEn: (m.actualizadoEn ?? new Date(0)).toISOString(),
      })),
    };
  }
}
