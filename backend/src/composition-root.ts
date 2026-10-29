import { MailerDev, MailerResend } from './adapters/mailer.js';
import { RevalidadorFrontend, revalidadorNulo } from './adapters/revalidador.js';
import { ServicioAuth } from './modules/auth/application/auth.js';
import { ServicioCatalogo } from './modules/catalogo/application/catalogo.js';
import { RepositorioCatalogo } from './modules/catalogo/infrastructure/repositorio.js';
import { ServicioBuscador } from './modules/compatibilidad/application/buscador.js';
import { RepositorioCompatibilidad } from './modules/compatibilidad/infrastructure/repositorio.js';
import { ServicioConfiguracion } from './modules/configuracion/application/configuracion.js';
import { ServicioZonas } from './modules/entregas/application/zonas.js';
import { Outbox } from './modules/notificaciones/application/outbox.js';
import { clavesDeCifrado, type Config } from './platform/config.js';
import { crearCifrador, type Cifrador } from './platform/crypto.js';
import { conectar, type BaseDeDatos, type ConexionDb } from './platform/db.js';
import { crearLogger, type Logger } from './platform/logger.js';
import type { Mailer, Revalidador } from './shared-kernel/puertos.js';
import { relojDelSistema, type Reloj } from './shared-kernel/reloj.js';

/**
 * Único lugar donde se eligen las implementaciones concretas (inversión de dependencias).
 * Los casos de uso reciben puertos; acá se decide si son reales, de desarrollo o falsos.
 */
export interface Contexto {
  config: Config;
  logger: Logger;
  conexion: ConexionDb;
  db: BaseDeDatos;
  reloj: Reloj;
  cifrador: Cifrador;
  mailer: Mailer;
  revalidador: Revalidador;
  outbox: Outbox;
  servicios: {
    auth: ServicioAuth;
    zonas: ServicioZonas;
    configuracion: ServicioConfiguracion;
    catalogo: ServicioCatalogo;
    buscador: ServicioBuscador;
  };
  cerrar(): Promise<void>;
}

export interface Reemplazos {
  conexion?: ConexionDb;
  reloj?: Reloj;
  mailer?: Mailer;
  revalidador?: Revalidador;
  logger?: Logger;
}

function elegirMailer(config: Config): Mailer {
  if (config.RESEND_API_KEY) {
    const permitidos =
      config.NODE_ENV === 'staging' ? [config.MAIL_ADMIN.toLowerCase()] : undefined;
    return new MailerResend(config.RESEND_API_KEY, config.MAIL_FROM, permitidos);
  }
  return new MailerDev(config.MAIL_FROM, config.SMTP_DEV_HOST ?? 'localhost', config.SMTP_DEV_PORT);
}

export function crearContexto(config: Config, reemplazos: Reemplazos = {}): Contexto {
  const logger = reemplazos.logger ?? crearLogger({ nivel: config.LOG_LEVEL });
  const conexion = reemplazos.conexion ?? conectar(config.DATABASE_URL);
  const db = conexion.db;
  const reloj = reemplazos.reloj ?? relojDelSistema;
  const cifrador = crearCifrador({
    claves: clavesDeCifrado(config),
    versionActual: config.DNI_KEY_VERSION,
  });
  const mailer = reemplazos.mailer ?? elegirMailer(config);
  const revalidador =
    reemplazos.revalidador ??
    (config.NODE_ENV === 'development' || config.NODE_ENV === 'test'
      ? revalidadorNulo
      : new RevalidadorFrontend(config.FRONTEND_URL, config.REVALIDATE_SECRET));
  const outbox = new Outbox(db, reloj);

  const zonas = new ServicioZonas(db);
  const configuracion = new ServicioConfiguracion(db, zonas);
  const repoCompatibilidad = new RepositorioCompatibilidad(db);
  const catalogo = new ServicioCatalogo({
    repo: new RepositorioCatalogo(db),
    configuracion,
    urlFoto: (clave) =>
      config.R2_PUBLIC_URL ? `${config.R2_PUBLIC_URL}/${clave}` : `${config.API_PUBLIC_URL}/uploads/${clave}`,
    autosDeMedida: (medida) => repoCompatibilidad.vehiculosDeMedida(medida),
  });
  const servicios = {
    auth: new ServicioAuth(db, outbox, reloj, config.API_PUBLIC_URL),
    zonas,
    configuracion,
    catalogo,
    buscador: new ServicioBuscador(repoCompatibilidad, catalogo, configuracion),
  };

  return {
    config,
    logger,
    conexion,
    db,
    reloj,
    cifrador,
    mailer,
    revalidador,
    outbox,
    servicios,
    cerrar: () => conexion.cerrar(),
  };
}
