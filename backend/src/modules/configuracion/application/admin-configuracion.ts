import type { ConfiguracionAdmin, EdicionConfiguracion, ZonaAdmin } from '@casa/shared';
import { eq } from 'drizzle-orm';
import type { BaseDeDatos } from '../../../platform/db.js';
import type { DatosZona, ServicioZonas, Zona } from '../../entregas/application/zonas.js';
import type { Outbox } from '../../notificaciones/application/outbox.js';
import { configuracion } from '../infrastructure/schema.js';
import type { ConfiguracionCompleta, ServicioConfiguracion } from './configuracion.js';

const soloDigitos = (cuit: string) => cuit.replace(/\D/g, '');

/**
 * Edición de la configuración desde el panel (FR-047). El descuento cambia los precios por
 * transferencia en todas las fichas, así que regenera el catálogo entero.
 */
export class ServicioAdminConfiguracion {
  constructor(
    private readonly db: BaseDeDatos,
    private readonly configuracion: ServicioConfiguracion,
    private readonly zonas: ServicioZonas,
    private readonly outbox: Outbox,
  ) {}

  async obtener(): Promise<ConfiguracionAdmin> {
    return aAdmin(await this.configuracion.obtener());
  }

  async editar(e: EdicionConfiguracion): Promise<ConfiguracionAdmin> {
    const c: Partial<typeof configuracion.$inferInsert> = {};
    if (e.descuentoPct !== undefined) c.descuentoPct = String(e.descuentoPct);
    if (e.banco?.titular !== undefined) c.bancoTitular = e.banco.titular;
    if (e.banco?.cbu !== undefined) c.bancoCbu = e.banco.cbu;
    if (e.banco?.alias !== undefined) c.bancoAlias = e.banco.alias;
    if (e.banco?.cuit !== undefined) c.bancoCuit = soloDigitos(e.banco.cuit);
    if (e.whatsapp !== undefined) c.whatsapp = e.whatsapp;
    if (e.horarios !== undefined) c.horarios = e.horarios;
    if (e.comercio?.razonSocial !== undefined) c.comercioRazonSocial = e.comercio.razonSocial;
    if (e.comercio?.cuit !== undefined) c.comercioCuit = soloDigitos(e.comercio.cuit);
    if (e.comercio?.domicilio !== undefined) c.comercioDomicilio = e.comercio.domicilio;
    if (e.comercio?.telefono !== undefined) c.comercioTelefono = e.comercio.telefono;
    if (e.comercio?.lat !== undefined) c.comercioLat = e.comercio.lat === null ? null : String(e.comercio.lat);
    if (e.comercio?.lng !== undefined) c.comercioLng = e.comercio.lng === null ? null : String(e.comercio.lng);
    if (e.googleResenasUrl !== undefined) c.googleResenasUrl = e.googleResenasUrl;

    await this.db.transaction(async (tx) => {
      if (Object.keys(c).length > 0) await tx.update(configuracion).set(c).where(eq(configuracion.id, 1));
      // Los datos bancarios no se publican: solo regenera si cambió algo visible.
      const soloBanco = Object.keys(e).every((k) => k === 'banco');
      if (!soloBanco) await this.outbox.revalidar(tx, ['configuracion', ...(e.descuentoPct !== undefined ? ['catalogo'] : [])]);
    });
    return this.obtener();
  }

  async listarZonas(): Promise<ZonaAdmin[]> {
    return (await this.zonas.listarTodas()).map(aZonaAdmin);
  }

  async crearZona(d: DatosZona): Promise<ZonaAdmin> {
    const zona = await this.zonas.crear(d);
    await this.outbox.revalidar(this.db, ['configuracion']);
    return aZonaAdmin(zona);
  }

  async editarZona(id: string, d: Partial<DatosZona>): Promise<ZonaAdmin> {
    const zona = await this.zonas.editar(id, d);
    await this.outbox.revalidar(this.db, ['configuracion']);
    return aZonaAdmin(zona);
  }
}

const aZonaAdmin = (z: Zona): ZonaAdmin => ({ id: z.id, nombre: z.nombre, costoExtra: z.costoExtra.aNumero(), activa: z.activa });

function aAdmin(c: ConfiguracionCompleta): ConfiguracionAdmin {
  return {
    descuentoPct: Number(c.descuentoPct),
    banco: { titular: c.bancoTitular, cbu: c.bancoCbu, alias: c.bancoAlias, cuit: c.bancoCuit },
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
    googleResenasUrl: c.googleResenasUrl,
  };
}
