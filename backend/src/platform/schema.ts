// Agregador de los esquemas de todos los módulos (para Drizzle y drizzle-kit).
// Cada tabla pertenece a su módulo: otro módulo la usa solo a través del servicio de ese módulo.
export * from '../modules/configuracion/infrastructure/schema.js';
export * from '../modules/entregas/infrastructure/schema.js';
export * from '../modules/auth/infrastructure/schema.js';
export * from '../modules/notificaciones/infrastructure/schema.js';
export * from '../modules/catalogo/infrastructure/schema.js';
export * from '../modules/compatibilidad/infrastructure/schema.js';
export * from '../modules/pedidos/infrastructure/schema.js';
export * from '../modules/clientes/infrastructure/schema.js';
export * from '../modules/pagos/infrastructure/schema.js';
export * from '../modules/canje/infrastructure/schema.js';
