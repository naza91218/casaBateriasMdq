import type { SolicitudConsultaCanje, Whatsapp } from '@casa/shared';
import type { Ejecutor } from '../../../platform/db.js';
import { validacion } from '../../../shared-kernel/errores.js';
import { slug } from '../../../shared-kernel/slug.js';
import { enlaceWhatsapp } from '../../../shared-kernel/whatsapp.js';
import type { ServicioConfiguracion } from '../../configuracion/application/configuracion.js';
import type { ServicioZonas } from '../../entregas/application/zonas.js';
import { consultasCanje } from '../infrastructure/schema.js';

/**
 * Consulta por el canje de la batería usada (FR-004): se guarda para el panel y sigue por
 * WhatsApp. El valor se define en el local; solo para Mar del Plata y zonas atendidas.
 */
export class ServicioCanje {
  constructor(
    private readonly db: Ejecutor,
    private readonly configuracion: ServicioConfiguracion,
    private readonly zonas: ServicioZonas,
  ) {}

  async registrar(s: SolicitudConsultaCanje): Promise<{ whatsapp: Whatsapp }> {
    const permitidas = new Set(['mar-del-plata', ...(await this.zonas.listarActivas()).map((z) => slug(z.nombre))]);
    if (!permitidas.has(slug(s.localidad))) {
      throw validacion({ localidad: 'Por ahora el canje es solo en Mar del Plata' });
    }
    await this.db.insert(consultasCanje).values({
      nombre: s.nombre,
      telefono: s.telefono,
      bateriaUsada: s.bateriaUsada ?? null,
      auto: s.auto ?? '',
      localidad: s.localidad,
      productoId: s.productoId ?? null,
    });
    const partes = [
      'Hola, quiero consultar por el canje de mi batería usada.',
      `Soy ${s.nombre}.`,
      s.auto ? `Auto: ${s.auto}.` : '',
      s.bateriaUsada ? `Batería usada: ${s.bateriaUsada}.` : '',
      `Localidad: ${s.localidad}.`,
    ].filter(Boolean);
    const config = await this.configuracion.obtener();
    return { whatsapp: enlaceWhatsapp(config.whatsapp, partes.join(' ')) };
  }
}
