/**
 * Tapa en un texto libre (mensajes de error, trazas) lo que puede ser un dato personal: mails y
 * números de 7 o más dígitos, como un DNI o un teléfono (FR-059). Los campos con nombre los
 * oculta el logger; esto cubre lo que llega mezclado dentro de un mensaje.
 */
export function sinDatosPersonales(texto: string): string {
  // Los números que son parte de otra palabra (un uuid, "v1234567") no se tocan.
  return texto
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[mail]')
    .replace(/(?<![\w.-])\d[\d .-]{5,}\d(?![\w-])/g, (m) =>
      m.replace(/\D/g, '').length >= 7 ? '[número]' : m,
    );
}

/** Copia de un error con el mensaje y la traza limpios, sin propiedades extra (detail, query). */
export function errorSinDatosPersonales(error: unknown): Error {
  if (!(error instanceof Error)) return new Error(sinDatosPersonales(String(error)));
  const limpio = new Error(sinDatosPersonales(error.message));
  limpio.name = error.name;
  limpio.stack = error.stack ? sinDatosPersonales(error.stack) : undefined;
  return limpio;
}
