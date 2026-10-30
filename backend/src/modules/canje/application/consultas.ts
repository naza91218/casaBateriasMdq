import type { SolicitudConsultaCanje, Whatsapp } from '@casa/shared';
import type { BaseDeDatos } from '../../../platform/db.js';
import { validacion } from '../../../shared-kernel/errores.js';
import { slug } from '../../../shared-kernel/slug.js';
import { enlaceWhatsapp } from '../../../shared-kernel/whatsapp.js';
import type { ServicioConfiguracion } from '../../configuracion/application/configuracion.js';
import { MAILS, mail } from '../../notificaciones/application/eventos.js';
import type { Outbox } from '../../notificaciones/application/outbox.js';
import type { ServicioZonas } from '../../entregas/application/zonas.js';
import { consultasCanje } from '../infrastructure/schema.js';

/**
 * Consulta por el canje de la batería usada (FR-004): se guarda para el panel y sigue por
 * WhatsApp; el administrador recibe un aviso (T116). El valor se define en el local; solo para
 * Mar del Plata y zonas atendidas.
 */
export class ServicioCanje {
  constructor(
    private readonly db: BaseDeDatos,
    private readonly configuracion: ServicioConfiguracion,
    private readonly zonas: ServicioZonas,
    private readonly outbox: Outbox,
    private readonly urlPanel: string,
  ) {}

  async registrar(s: SolicitudConsultaCanje): Promise<{ whatsapp: Whatsapp }> {
    const permitidas = new Set([
      'mar-del-plata',
      ...(await this.zonas.listarActivas()).map((z) => slug(z.nombre)),
    ]);
    if (!permitidas.has(slug(s.localidad))) {
      throw validacion({ localidad: 'Por ahora el canje es solo en Mar del Plata' });
    }
    await this.db.transaction(async (tx) => {
      const [consulta] = await tx
        .insert(consultasCanje)
        .values({
          nombre: s.nombre,
          telefono: s.telefono,
          bateriaUsada: s.bateriaUsada ?? null,
          auto: s.auto ?? '',
          localidad: s.localidad,
          productoId: s.productoId ?? null,
        })
        .returning({ id: consultasCanje.id });
      const datos = { ...s, urlPanel: this.urlPanel };
      await this.outbox.encolar(
        tx,
        mail(MAILS.consultaCanje.admin, 'admin', String(consulta?.id), datos),
      );
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
