import { AlmacenamientoDisco, AlmacenamientoR2 } from './adapters/almacenamiento.js';
import { MailerDev, MailerResend } from './adapters/mailer.js';
import { PasarelaFalsa, PasarelaMercadoPago } from './adapters/mercadopago.js';
import { RevalidadorFrontend, revalidadorNulo } from './adapters/revalidador.js';
import { ServicioAdminCanje } from './modules/canje/application/admin-consultas.js';
import { ServicioCanje } from './modules/canje/application/consultas.js';
import { ServicioAdminProductos } from './modules/catalogo/application/admin-productos.js';
import { ServicioFotos } from './modules/catalogo/application/fotos.js';
import { ServicioAdminVehiculos } from './modules/compatibilidad/application/admin-vehiculos.js';
import { ServicioAdminConfiguracion } from './modules/configuracion/application/admin-configuracion.js';
import { ServicioImportacion } from './modules/importacion/application/importar.js';
import { ServicioStock } from './modules/catalogo/application/stock.js';
import { ServicioCompradores } from './modules/clientes/application/compradores.js';
import { ServicioAlertas } from './modules/pagos/application/alertas.js';
import { ServicioPagosManuales } from './modules/pagos/application/pagos-manuales.js';
import { ServicioPagosMercadoPago } from './modules/pagos/application/procesar-pago.js';
import { ServicioEstados } from './modules/pedidos/application/cambiar-estado.js';
import { ServicioPanelPedidos } from './modules/pedidos/application/consultas-panel.js';
import { ServicioPedidos } from './modules/pedidos/application/crear-pedido.js';
import { DatosMailPedido } from './modules/pedidos/application/datos-mail.js';
import { ServicioSeguimiento } from './modules/pedidos/application/seguimiento.js';
import { ServicioVencimientos } from './modules/pedidos/application/vencimientos.js';
import { ServicioAuth } from './modules/auth/application/auth.js';
import { ServicioCatalogo } from './modules/catalogo/application/catalogo.js';
import { RepositorioCatalogo } from './modules/catalogo/infrastructure/repositorio.js';
import { ServicioBuscador } from './modules/compatibilidad/application/buscador.js';
import { RepositorioCompatibilidad } from './modules/compatibilidad/infrastructure/repositorio.js';
import { ServicioConfiguracion } from './modules/configuracion/application/configuracion.js';
import { ServicioZonas } from './modules/entregas/application/zonas.js';
import { enlacesPanel } from './modules/notificaciones/application/eventos.js';
import { Outbox } from './modules/notificaciones/application/outbox.js';
import { ServicioPaginaVehiculo } from './modules/compatibilidad/application/pagina-vehiculo.js';
import { ServicioIndiceSeo } from './modules/catalogo/application/indice-seo.js';
import { ServicioArrepentimientos } from './modules/legales/application/arrepentimientos.js';
import { ServicioAnonimizacion } from './modules/clientes/application/anonimizar.js';
import { clavesDeCifrado, type Config } from './platform/config.js';
import { crearCifrador, crearFirmadorSeguimiento, type Cifrador } from './platform/crypto.js';
import { conectar, type BaseDeDatos, type ConexionDb } from './platform/db.js';
import { crearLogger, type Logger } from './platform/logger.js';
import type { Almacenamiento, Mailer, PasarelaPago, Revalidador } from './shared-kernel/puertos.js';
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
  pasarela: PasarelaPago;
  almacenamiento: Almacenamiento;
  outbox: Outbox;
  servicios: {
    auth: ServicioAuth;
    zonas: ServicioZonas;
    configuracion: ServicioConfiguracion;
    catalogo: ServicioCatalogo;
    buscador: ServicioBuscador;
    paginaVehiculo: ServicioPaginaVehiculo;
    indiceSeo: ServicioIndiceSeo;
    stock: ServicioStock;
    compradores: ServicioCompradores;
    estados: ServicioEstados;
    pedidos: ServicioPedidos;
    seguimiento: ServicioSeguimiento;
    vencimientos: ServicioVencimientos;
    pagosMp: ServicioPagosMercadoPago;
    pagosManuales: ServicioPagosManuales;
    alertas: ServicioAlertas;
    panelPedidos: ServicioPanelPedidos;
    arrepentimientos: ServicioArrepentimientos;
    anonimizacion: ServicioAnonimizacion;
    canje: ServicioCanje;
    fotos: ServicioFotos;
    adminProductos: ServicioAdminProductos;
    adminVehiculos: ServicioAdminVehiculos;
    adminConfiguracion: ServicioAdminConfiguracion;
    adminCanje: ServicioAdminCanje;
    importacion: ServicioImportacion;
  };
  cerrar(): Promise<void>;
}

export interface Reemplazos {
  conexion?: ConexionDb;
  reloj?: Reloj;
  mailer?: Mailer;
  revalidador?: Revalidador;
  pasarela?: PasarelaPago;
  almacenamiento?: Almacenamiento;
  logger?: Logger;
}

function elegirAlmacenamiento(config: Config): Almacenamiento {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL } =
    config;
  if (R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET && R2_PUBLIC_URL) {
    return new AlmacenamientoR2(
      R2_ACCOUNT_ID,
      R2_ACCESS_KEY_ID,
      R2_SECRET_ACCESS_KEY,
      R2_BUCKET,
      R2_PUBLIC_URL,
    );
  }
  return new AlmacenamientoDisco(config.UPLOADS_DIR, config.API_PUBLIC_URL);
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
  if (
    !config.MP_ACCESS_TOKEN &&
    !reemplazos.pasarela &&
    (config.NODE_ENV === 'staging' || config.NODE_ENV === 'production')
  ) {
    throw new Error('Falta MP_ACCESS_TOKEN fuera de desarrollo');
  }
  // Sin credenciales (desarrollo), los pagos se simulan en memoria.
  const pasarela =
    reemplazos.pasarela ??
    (config.MP_ACCESS_TOKEN
      ? new PasarelaMercadoPago(config.MP_ACCESS_TOKEN, config.MP_WEBHOOK_SECRET ?? '')
      : new PasarelaFalsa(config.MP_WEBHOOK_SECRET ?? 'secreto-webhook-de-prueba'));
  const almacenamiento = reemplazos.almacenamiento ?? elegirAlmacenamiento(config);
  const outbox = new Outbox(db, reloj);
  const panel = enlacesPanel(config.FRONTEND_URL);
  const claveSeguimiento = clavesDeCifrado(config)[config.DNI_KEY_VERSION];
  if (!claveSeguimiento) throw new Error('Falta la clave de cifrado actual');
  const firmador = crearFirmadorSeguimiento(claveSeguimiento);

  const zonas = new ServicioZonas(db);
  const configuracion = new ServicioConfiguracion(db, zonas);
  const repoCompatibilidad = new RepositorioCompatibilidad(db);
  const repoCatalogo = new RepositorioCatalogo(db);
  const catalogo = new ServicioCatalogo({
    repo: repoCatalogo,
    configuracion,
    urlFoto: (clave) => almacenamiento.urlPublica(clave),
    autosDeMedida: (medida) => repoCompatibilidad.vehiculosDeMedida(medida),
  });
  const stock = new ServicioStock(db);
  const compradores = new ServicioCompradores(cifrador);
  const datosMail = new DatosMailPedido(compradores, configuracion, firmador, config.FRONTEND_URL);
  const estados = new ServicioEstados(db, stock, outbox, datosMail);
  const pedidos = new ServicioPedidos({
    db,
    stock,
    compradores,
    configuracion,
    zonas,
    outbox,
    pasarela,
    datosMail,
    reloj,
    logger,
    urlApi: config.API_PUBLIC_URL,
    maxPedidosSinPagar: config.MAX_PEDIDOS_SIN_PAGAR,
  });
  const alertas = new ServicioAlertas(db, reloj);
  const arrepentimientos = new ServicioArrepentimientos(
    db,
    compradores,
    configuracion,
    outbox,
    panel,
  );
  const fotos = new ServicioFotos(db, almacenamiento, outbox);
  const servicios = {
    auth: new ServicioAuth(db, outbox, reloj, config.API_PUBLIC_URL),
    zonas,
    configuracion,
    catalogo,
    buscador: new ServicioBuscador(repoCompatibilidad, catalogo, configuracion),
    paginaVehiculo: new ServicioPaginaVehiculo(repoCompatibilidad, catalogo, configuracion, zonas),
    indiceSeo: new ServicioIndiceSeo(repoCatalogo, () =>
      repoCompatibilidad.modelosConCompatibilidad(),
    ),
    stock,
    compradores,
    estados,
    pedidos,
    seguimiento: new ServicioSeguimiento(
      db,
      firmador,
      configuracion,
      zonas,
      compradores,
      pedidos,
      reloj,
    ),
    vencimientos: new ServicioVencimientos(db, estados, reloj),
    pagosMp: new ServicioPagosMercadoPago(db, pasarela, estados, outbox, panel.pedido),
    pagosManuales: new ServicioPagosManuales(db, estados),
    alertas,
    panelPedidos: new ServicioPanelPedidos(
      db,
      estados,
      compradores,
      zonas,
      alertas,
      arrepentimientos,
      reloj,
    ),
    arrepentimientos,
    anonimizacion: new ServicioAnonimizacion(db, cifrador, arrepentimientos, outbox, reloj),
    canje: new ServicioCanje(db, configuracion, zonas, outbox, panel.canje()),
    fotos,
    adminProductos: new ServicioAdminProductos(db, fotos, outbox),
    adminVehiculos: new ServicioAdminVehiculos(db, outbox),
    adminConfiguracion: new ServicioAdminConfiguracion(db, configuracion, zonas, outbox),
    adminCanje: new ServicioAdminCanje(db),
    importacion: new ServicioImportacion(db, fotos, outbox, reloj, {
      carpetaFotos: config.IMPORT_FOTOS_DIR,
    }),
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
    pasarela,
    almacenamiento,
    outbox,
    servicios,
    cerrar: () => conexion.cerrar(),
  };
}
