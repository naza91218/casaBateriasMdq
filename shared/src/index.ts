// Contratos compartidos entre backend y frontend (esquemas Zod de requests y responses).
import { z } from 'zod';

// Mensajes de validación en español para todos los esquemas.
z.config(z.locales.es());

export * from './contratos/comunes.ts';
export * from './contratos/configuracion.ts';
export * from './contratos/catalogo.ts';
export * from './contratos/vehiculos.ts';
export * from './contratos/pedidos.ts';
export * from './contratos/admin-pedidos.ts';
export * from './contratos/admin-catalogo.ts';
