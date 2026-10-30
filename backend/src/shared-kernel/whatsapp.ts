/** Salida a WhatsApp con el contexto ya escrito (constitución III, FR-012, FR-068). */
export interface EnlaceWhatsapp {
  url: string;
  mensaje: string;
}

export function enlaceWhatsapp(numero: string, mensaje: string): EnlaceWhatsapp {
  const digitos = numero.replace(/\D/g, '');
  const base = digitos ? `https://wa.me/${digitos}` : 'https://wa.me/';
  return { url: `${base}?text=${encodeURIComponent(mensaje)}`, mensaje };
}

/**
 * Teléfono argentino como lo carga el comprador ("0223 15-512 3456", "223 512 3456") al formato
 * internacional de WhatsApp para celulares: 549 + área + número, sin el 0 ni el 15.
 */
export function telefonoArgentino(telefono: string): string {
  let d = telefono.replace(/\D/g, '');
  if (d.startsWith('549')) return d;
  if (d.startsWith('54')) d = d.slice(2);
  if (d.startsWith('0')) d = d.slice(1);
  // El 15 va después del código de área (2 a 4 dígitos); el número sin 15 tiene 10 dígitos.
  if (d.length === 12) {
    for (const area of [2, 3, 4]) {
      if (d.slice(area, area + 2) === '15') {
        d = d.slice(0, area) + d.slice(area + 2);
        break;
      }
    }
  }
  return `549${d}`;
}

export const mensajes = {
  buscoAuto: (marca: string, modelo: string, anio?: number | string | null) =>
    `Hola, busco batería para un ${marca} ${modelo}${anio ? ` ${anio}` : ''}`,
  consultaProducto: (nombre: string) => `Hola, quiero consultar por la batería ${nombre}`,
};
