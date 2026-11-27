import type { ArrepentimientoAdmin, SolicitudArrepentimiento } from '@casa/shared';
import { randomInt } from 'node:crypto';
import { asc, desc, eq } from 'drizzle-orm';
import type { BaseDeDatos, Ejecutor } from '../../../platform/db.js';
import type { ServicioCompradores } from '../../clientes/application/compradores.js';
import type { ServicioConfiguracion } from '../../configuracion/application/configuracion.js';
import { MAILS, mail } from '../../notificaciones/application/eventos.js';
import type { Outbox } from '../../notificaciones/application/outbox.js';
import { pedidos } from '../../pedidos/infrastructure/schema.js';
import { arrepentimientos } from '../infrastructure/schema.js';

/** Sin 0/O ni 1/I: el comprador lo puede dictar por teléfono sin confundirse. */
const ALFABETO = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function codigoArrepentimiento(): string {
  let c = 'ARR-';
  for (let i = 0; i < 4; i++) c += ALFABETO[randomInt(ALFABETO.length)];
  return c;
}

/**
 * Botón de arrepentimiento (FR-058). Siempre se registra y se avisa al administrador, aunque el
 * número no exista: lo resuelve el local. La constancia por mail sale solo si el mail coincide
 * con el del pedido, para que el formulario no sirva para mandarle mails a cualquiera.
 */
export class ServicioArrepentimientos {
  constructor(
    private readonly db: BaseDeDatos,
    private readonly compradores: ServicioCompradores,
    private readonly configuracion: ServicioConfiguracion,
    private readonly outbox: Outbox,
    private readonly enlaces: { pedido: (id: string) => string; arrepentimientos: () => string },
  ) {}

  async registrar(s: SolicitudArrepentimiento): Promise<{ codigo: string }> {
    return this.db.transaction(async (tx) => {
      const [pedido] = await tx
        .select({ id: pedidos.id })
        .from(pedidos)
        .where(eq(pedidos.numero, s.numeroPedido));
      const codigo = await this.codigoLibre(tx);
      const [fila] = await tx
        .insert(arrepentimientos)
        .values({
          pedidoId: pedido?.id ?? null,
          numeroPedido: s.numeroPedido,
          nombre: s.nombre,
          email: s.email,
          codigo,
        })
        .returning({ id: arrepentimientos.id });
      const id = String(fila?.id);
      const pedidoId = pedido?.id ?? null;

      await this.outbox.encolar(
        tx,
        mail(
          MAILS.arrepentimiento.admin,
          'admin',
          id,
          {
            nombre: s.nombre,
            numero: s.numeroPedido,
            codigo,
            pedidoEncontrado: pedidoId !== null,
            urlPanel: pedidoId ? this.enlaces.pedido(pedidoId) : this.enlaces.arrepentimientos(),
          },
          pedidoId,
        ),
      );

      const contacto = pedidoId ? await this.compradores.contacto(tx, pedidoId) : null;
      if (contacto && contacto.email.toLowerCase() === s.email) {
        const config = await this.configuracion.obtener(tx);
        await this.outbox.encolar(
          tx,
          mail(
            MAILS.arrepentimiento.comprador,
            'comprador',
            id,
            {
              email: contacto.email,
              nombre: s.nombre.split(' ')[0],
              numero: s.numeroPedido,
              codigo,
              comercio: {
                razonSocial: config.comercioRazonSocial,
                cuit: config.comercioCuit,
                domicilio: config.comercioDomicilio,
                telefono: config.comercioTelefono,
              },
            },
            pedidoId,
          ),
        );
      }
      return { codigo };
    });
  }

  private async codigoLibre(ej: Ejecutor): Promise<string> {
    for (let intento = 0; intento < 10; intento++) {
      const codigo = codigoArrepentimiento();
      const [usado] = await ej
        .select({ id: arrepentimientos.id })
        .from(arrepentimientos)
        .where(eq(arrepentimientos.codigo, codigo));
      if (!usado) return codigo;
    }
    throw new Error('No se pudo generar un código de arrepentimiento libre');
  }

  async listar(): Promise<ArrepentimientoAdmin[]> {
    const filas = await this.db
      .select()
      .from(arrepentimientos)
      .orderBy(desc(arrepentimientos.creadoEn), desc(arrepentimientos.id))
      .limit(500);
    return filas.map((f) => ({
      id: f.id,
      codigo: f.codigo,
      numeroPedido: f.numeroPedido,
      pedidoId: f.pedidoId,
      nombre: f.nombre,
      email: f.email,
      creadoEn: f.creadoEn.toISOString(),
    }));
  }

  /** Lo que muestra el detalle del pedido en el panel. */
  async delPedido(ej: Ejecutor, pedidoId: string): Promise<{ codigo: string; creadoEn: string }[]> {
    const filas = await ej
      .select({ codigo: arrepentimientos.codigo, creadoEn: arrepentimientos.creadoEn })
      .from(arrepentimientos)
      .where(eq(arrepentimientos.pedidoId, pedidoId))
      .orderBy(asc(arrepentimientos.creadoEn));
    return filas.map((f) => ({ codigo: f.codigo, creadoEn: f.creadoEn.toISOString() }));
  }

  /** Parte de anonimizar el pedido (FR-061): la solicitud queda, sin datos personales. */
  async anonimizarDelPedido(ej: Ejecutor, pedidoId: string): Promise<void> {
    await ej
      .update(arrepentimientos)
      .set({ nombre: 'Anónimo', email: '' })
      .where(eq(arrepentimientos.pedidoId, pedidoId));
  }
}
