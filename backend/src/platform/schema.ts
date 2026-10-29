// Agregador de los esquemas de todos los módulos (para Drizzle y drizzle-kit).
// Cada tabla pertenece a su módulo: otro módulo la usa solo a través del servicio de ese módulo.
export * from '../modules/configuracion/infrastructure/schema.js';
export * from '../modules/entregas/infrastructure/schema.js';
export * from '../modules/auth/infrastructure/schema.js';
export * from '../modules/notificaciones/infrastructure/schema.js';
