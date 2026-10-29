// Contratos compartidos entre backend y frontend (esquemas Zod de requests y responses).
import { z } from 'zod';

// Mensajes de validación en español para todos los esquemas.
z.config(z.locales.es());

export * from './contratos/comunes.js';
export * from './contratos/configuracion.js';
export * from './contratos/catalogo.js';
export * from './contratos/vehiculos.js';
export * from './contratos/pedidos.js';
