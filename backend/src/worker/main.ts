import { crearContexto, type Contexto } from '../composition-root.js';
import { crearDespachador } from '../modules/notificaciones/application/despachador.js';
import { cargarConfig } from '../platform/config.js';
import { iniciarSentry } from '../platform/sentry.js';
import { errorSinDatosPersonales } from '../shared-kernel/privacidad.js';
import { MINUTO } from '../shared-kernel/reloj.js';

export interface TareaPeriodica {
  nombre: string;
  cadaMs: number;
  ejecutar(): Promise<unknown>;
}

/** Tareas del worker (research R6). */
export function tareasDelWorker(ctx: Contexto): TareaPeriodica[] {
  const despachar = crearDespachador({
    mailer: ctx.mailer,
    revalidador: ctx.revalidador,
    mailAdmin: ctx.config.MAIL_ADMIN,
  });
  return [
    { nombre: 'outbox', cadaMs: 10_000, ejecutar: () => ctx.outbox.procesarLote(despachar) },
    // Cancela pedidos impagos vencidos y devuelve stock (FR-034).
    { nombre: 'vencimientos', cadaMs: MINUTO, ejecutar: () => ctx.servicios.vencimientos.cancelarVencidos() },
  ];
}

/** Corre cada tarea en su propio bucle; un error en una no frena a las demás. */
export function iniciarBucles(
  ctx: Contexto,
  tareas: TareaPeriodica[],
  reportar: (e: unknown) => void,
): () => Promise<void> {
  let activo = true;
  const enCurso = new Set<Promise<void>>();

  for (const tarea of tareas) {
    const bucle = (async () => {
      while (activo) {
        try {
          await tarea.ejecutar();
        } catch (error) {
          const limpio = errorSinDatosPersonales(error);
          ctx.logger.error({ tarea: tarea.nombre, err: limpio.message }, 'falló una tarea del worker');
          reportar(limpio);
        }
        await new Promise((r) => setTimeout(r, tarea.cadaMs));
      }
    })();
    enCurso.add(bucle);
  }

  return async () => {
    activo = false;
    await Promise.race([Promise.all(enCurso), new Promise((r) => setTimeout(r, MINUTO))]);
  };
}

const esEntrada = process.argv[1]?.replaceAll('\\', '/').endsWith('/worker/main.ts') ||
  process.argv[1]?.replaceAll('\\', '/').endsWith('/worker/main.js');

if (esEntrada) {
  const config = cargarConfig();
  const reportar = iniciarSentry({ dsn: config.SENTRY_DSN, entorno: config.NODE_ENV });
  const ctx = crearContexto(config);
  const detener = iniciarBucles(ctx, tareasDelWorker(ctx), reportar);
  ctx.logger.info('worker iniciado');

  const cerrar = async () => {
    ctx.logger.info('deteniendo worker');
    await detener();
    await ctx.cerrar();
    process.exit(0);
  };
  process.on('SIGTERM', cerrar);
  process.on('SIGINT', cerrar);
}
