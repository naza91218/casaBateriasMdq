import { eq } from 'drizzle-orm';
import type { Ejecutor } from '../../../platform/db.js';
import type { ServicioZonas } from '../../entregas/application/zonas.js';
import { configuracion, type FranjaHoraria } from '../infrastructure/schema.js';

export type ConfiguracionCompleta = typeof configuracion.$inferSelect;

export interface ConfiguracionPublica {
  descuentoPct: number;
  whatsapp: string;
  horarios: FranjaHoraria[];
  comercio: {
    razonSocial: string;
    cuit: string;
    domicilio: string;
    telefono: string;
    lat: number | null;
    lng: number | null;
  };
  zonas: { id: string; nombre: string; costoExtra: number }[];
  googleResenasUrl: string;
}

export class ServicioConfiguracion {
  constructor(
    private readonly db: Ejecutor,
    private readonly zonas: ServicioZonas,
  ) {}

  async obtener(ejecutor: Ejecutor = this.db): Promise<ConfiguracionCompleta> {
    const [fila] = await ejecutor.select().from(configuracion).where(eq(configuracion.id, 1));
    if (!fila) throw new Error('Falta la fila de configuración: corré el seed base');
    return fila;
  }

  /** Lo que la tienda puede mostrar. Sin datos bancarios: esos van solo al pedido por transferencia. */
  async obtenerPublica(): Promise<ConfiguracionPublica> {
    const [c, zonas] = await Promise.all([this.obtener(), this.zonas.listarActivas()]);
    return {
      descuentoPct: Number(c.descuentoPct),
      whatsapp: c.whatsapp,
      horarios: c.horarios,
      comercio: {
        razonSocial: c.comercioRazonSocial,
        cuit: c.comercioCuit,
        domicilio: c.comercioDomicilio,
        telefono: c.comercioTelefono,
        lat: c.comercioLat === null ? null : Number(c.comercioLat),
        lng: c.comercioLng === null ? null : Number(c.comercioLng),
      },
      zonas: zonas.map((z) => ({ id: z.id, nombre: z.nombre, costoExtra: z.costoExtra.aNumero() })),
      googleResenasUrl: c.googleResenasUrl,
    };
  }
}
