/**
 * Errores de dominio. El `mensaje` se muestra tal cual al comprador o al admin:
 * voseo, frases cortas, sin tecnicismos (constitución, restricciones).
 */
export type TipoError =
  | 'validacion'
  | 'no_autorizado'
  | 'prohibido'
  | 'no_encontrado'
  | 'conflicto'
  | 'regla_de_negocio'
  | 'limite';

export const ESTADO_HTTP: Record<TipoError, number> = {
  validacion: 400,
  no_autorizado: 401,
  prohibido: 403,
  no_encontrado: 404,
  conflicto: 409,
  regla_de_negocio: 422,
  limite: 429,
};

export class ErrorDeDominio extends Error {
  constructor(
    readonly tipo: TipoError,
    readonly codigo: string,
    readonly mensaje: string,
    readonly campos?: Record<string, string>,
    readonly datos?: Record<string, unknown>,
  ) {
    super(mensaje);
    this.name = 'ErrorDeDominio';
  }
}

export const noEncontrado = (mensaje = 'No encontramos lo que buscás') =>
  new ErrorDeDominio('no_encontrado', 'NO_ENCONTRADO', mensaje);

export const validacion = (campos: Record<string, string>, mensaje = 'Revisá los datos marcados') =>
  new ErrorDeDominio('validacion', 'VALIDACION', mensaje, campos);

export type Result<T, E = ErrorDeDominio> = { ok: true; valor: T } | { ok: false; error: E };

export const ok = <T>(valor: T): Result<T, never> => ({ ok: true, valor });
export const fallo = <E>(error: E): Result<never, E> => ({ ok: false, error });
