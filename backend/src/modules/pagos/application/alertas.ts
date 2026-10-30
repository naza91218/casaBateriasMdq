import type { Alerta } from '@casa/shared';
import { and, count, desc, eq, inArray, isNull } from 'drizzle-orm';
import type { BaseDeDatos, Ejecutor } from '../../../platform/db.js';
import { ErrorDeDominio, noEncontrado } from '../../../shared-kernel/errores.js';
import type { Reloj } from '../../../shared-kernel/reloj.js';
import { usuariosPanel } from '../../auth/infrastructure/schema.js';
import { pedidos } from '../../pedidos/infrastructure/schema.js';
import { alertas } from '../infrastructure/schema.js';

/**
 * Alertas de pago que decide el administrador (FR-031): un monto distinto o un pago sobre un
 * pedido cancelado. Resolverla solo deja constancia de quién la miró; el pedido no cambia.
 */
export class ServicioAlertas {
  constructor(
    private readonly db: BaseDeDatos,
    private readonly reloj: Reloj,
  ) {}

  async listar(opciones: { soloAbiertas: boolean; pedidoIds?: string[]; id?: string }, ej: Ejecutor = this.db): Promise<Alerta[]> {
    const filtros = [
      opciones.soloAbiertas ? isNull(alertas.resueltaEn) : undefined,
      opciones.pedidoIds ? inArray(alertas.pedidoId, opciones.pedidoIds) : undefined,
      opciones.id ? eq(alertas.id, opciones.id) : undefined,
    ];
    const filas = await ej
      .select({
        id: alertas.id,
        pedidoId: alertas.pedidoId,
        numeroPedido: pedidos.numero,
        tipo: alertas.tipo,
        detalle: alertas.detalle,
        creadoEn: alertas.creadoEn,
        resueltaEn: alertas.resueltaEn,
        resueltaPor: usuariosPanel.email,
      })
      .from(alertas)
      .innerJoin(pedidos, eq(pedidos.id, alertas.pedidoId))
      .leftJoin(usuariosPanel, eq(usuariosPanel.id, alertas.resueltaPor))
      .where(and(...filtros))
      .orderBy(desc(alertas.creadoEn));
    return filas.map((f) => ({
      ...f,
      creadoEn: f.creadoEn.toISOString(),
      resueltaEn: f.resueltaEn?.toISOString() ?? null,
      resueltaPor: f.resueltaPor ?? null,
    }));
  }

  async contarAbiertas(): Promise<number> {
    const [fila] = await this.db.select({ n: count() }).from(alertas).where(isNull(alertas.resueltaEn));
    return fila?.n ?? 0;
  }

  async resolver(id: string, usuarioId: string): Promise<Alerta> {
    const [resuelta] = await this.db
      .update(alertas)
      .set({ resueltaEn: this.reloj.ahora(), resueltaPor: usuarioId })
      .where(and(eq(alertas.id, id), isNull(alertas.resueltaEn)))
      .returning({ id: alertas.id });
    if (!resuelta) {
      const [existe] = await this.db.select({ id: alertas.id }).from(alertas).where(eq(alertas.id, id));
      if (!existe) throw noEncontrado('No encontramos esa alerta');
      throw new ErrorDeDominio('conflicto', 'ALERTA_YA_RESUELTA', 'Esa alerta ya estaba resuelta');
    }
    const [alerta] = await this.listar({ soloAbiertas: false, id });
    if (!alerta) throw noEncontrado('No encontramos esa alerta');
    return alerta;
  }
}
