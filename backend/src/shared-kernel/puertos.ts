/**
 * Puertos (interfaces) que el dominio y los casos de uso necesitan del mundo exterior.
 * Las implementaciones viven en src/adapters/ y se conectan en composition-root.ts
 * (inversión de dependencias). En los tests se usan versiones falsas.
 */

export interface MensajeMail {
  para: string;
  asunto: string;
  html: string;
  texto: string;
}

export interface Mailer {
  enviar(mensaje: MensajeMail): Promise<void>;
}

export interface Almacenamiento {
  guardar(clave: string, contenido: Buffer, tipoContenido: string): Promise<void>;
  borrar(clave: string): Promise<void>;
  urlPublica(clave: string): string;
}

export interface ItemPreferencia {
  titulo: string;
  cantidad: number;
  precioUnitarioCentavos: bigint;
}

export interface PreferenciaPago {
  pedidoId: string;
  items: ItemPreferencia[];
  emailComprador: string;
  urlRetorno: string;
  urlNotificacion: string;
  venceEn: Date;
}

export type EstadoPagoExterno =
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'pending'
  | 'in_process'
  | 'refunded'
  | 'charged_back';

export interface PagoExterno {
  id: string;
  estado: EstadoPagoExterno;
  montoCentavos: bigint;
  referenciaExterna: string | null;
  /** Respuesta del proveedor sin datos personales, para auditoría. */
  resumen: Record<string, unknown>;
}

export interface FirmaWebhook {
  idRecurso: string;
  requestId: string;
  cabeceraFirma: string;
}

export interface PasarelaPago {
  crearPreferencia(preferencia: PreferenciaPago): Promise<{ id: string; initPoint: string }>;
  consultarPago(id: string): Promise<PagoExterno>;
  verificarFirma(firma: FirmaWebhook): boolean;
}

/** Avisa al frontend qué páginas regenerar (ISR) después de un cambio del admin. */
export interface Revalidador {
  revalidar(etiquetas: string[]): Promise<void>;
}
