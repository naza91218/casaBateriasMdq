import type { ConsultaCanjeAdmin } from '@casa/shared';
import { and, count, desc, eq } from 'drizzle-orm';
import type { BaseDeDatos } from '../../../platform/db.js';
import { noEncontrado } from '../../../shared-kernel/errores.js';
import { enlaceWhatsapp, telefonoArgentino } from '../../../shared-kernel/whatsapp.js';
import { productos } from '../../catalogo/infrastructure/schema.js';
import { consultasCanje } from '../infrastructure/schema.js';

type EstadoConsulta = 'pendiente' | 'atendida';

/**
 * Celda de planilla. Excel en español usa `;` como separador. Lo que empieza con = + - @ se
 * antepone con ' para que Excel no lo ejecute como fórmula (inyección en CSV).
 */
function celda(valor: string): string {
  const seguro = /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;
  return `"${seguro.replaceAll('"', '""')}"`;
}

/** Consultas de canje en el panel (FR-004b): más nuevas primero y descargables como planilla. */
export class ServicioAdminCanje {
  constructor(private readonly db: BaseDeDatos) {}

  async listar(
    f: { estado?: EstadoConsulta | undefined; id?: string } = {},
  ): Promise<ConsultaCanjeAdmin[]> {
    const filas = await this.db
      .select({
        id: consultasCanje.id,
        nombre: consultasCanje.nombre,
        telefono: consultasCanje.telefono,
        bateriaUsada: consultasCanje.bateriaUsada,
        auto: consultasCanje.auto,
        localidad: consultasCanje.localidad,
        producto: productos.nombre,
        estado: consultasCanje.estado,
        creadoEn: consultasCanje.creadoEn,
      })
      .from(consultasCanje)
      .leftJoin(productos, eq(productos.id, consultasCanje.productoId))
      .where(
        and(
          f.estado ? eq(consultasCanje.estado, f.estado) : undefined,
          f.id ? eq(consultasCanje.id, f.id) : undefined,
        ),
      )
      .orderBy(desc(consultasCanje.creadoEn), desc(consultasCanje.id))
      .limit(1000);
    return filas.map((f) => ({
      ...f,
      producto: f.producto ?? null,
      creadoEn: f.creadoEn.toISOString(),
      whatsapp: enlaceWhatsapp(
        telefonoArgentino(f.telefono),
        `Hola ${f.nombre.split(' ')[0] ?? ''}, te escribimos de La Casa de las Baterías por tu consulta de canje`,
      ),
    }));
  }

  async planilla(estado?: EstadoConsulta): Promise<string> {
    const encabezados = [
      'Fecha',
      'Nombre',
      'Teléfono',
      'Batería usada',
      'Auto',
      'Localidad',
      'Producto',
      'Estado',
    ];
    const filas = (await this.listar({ estado })).map((c) =>
      [
        new Date(c.creadoEn).toLocaleString('es-AR', {
          timeZone: 'America/Argentina/Buenos_Aires',
        }),
        c.nombre,
        c.telefono,
        c.bateriaUsada ?? '',
        c.auto,
        c.localidad,
        c.producto ?? '',
        c.estado,
      ]
        .map(celda)
        .join(';'),
    );
    // BOM: Excel abre bien las tildes solo si el archivo lo trae.
    const BOM = String.fromCharCode(0xfeff);
    return `${BOM}${[encabezados.map(celda).join(';'), ...filas].join('\r\n')}\r\n`;
  }

  async cambiarEstado(id: string, estado: EstadoConsulta): Promise<ConsultaCanjeAdmin> {
    const [f] = await this.db
      .update(consultasCanje)
      .set({ estado })
      .where(eq(consultasCanje.id, id))
      .returning({ id: consultasCanje.id });
    if (!f) throw noEncontrado('No encontramos esa consulta');
    const [consulta] = await this.listar({ id });
    if (!consulta) throw noEncontrado('No encontramos esa consulta');
    return consulta;
  }

  async contarPendientes(): Promise<number> {
    const [fila] = await this.db
      .select({ n: count() })
      .from(consultasCanje)
      .where(eq(consultasCanje.estado, 'pendiente'));
    return fila?.n ?? 0;
  }
}
