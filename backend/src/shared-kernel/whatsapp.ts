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

export const mensajes = {
  buscoAuto: (marca: string, modelo: string, anio: number | string) =>
    `Hola, busco batería para un ${marca} ${modelo} ${anio}`,
  consultaProducto: (nombre: string) => `Hola, quiero consultar por la batería ${nombre}`,
};
