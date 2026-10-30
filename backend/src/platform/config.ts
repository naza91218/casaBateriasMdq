import { z } from 'zod';

const vacioComoIndefinido = (v: unknown) => (v === '' ? undefined : v);
const opcional = () => z.preprocess(vacioComoIndefinido, z.string().optional());

const esquema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().default(4000),
  LOG_LEVEL: z.string().default('info'),

  DATABASE_URL: z.string().url(),
  TEST_DATABASE_URL: opcional(),

  API_PUBLIC_URL: z.string().url(),
  FRONTEND_URL: z.string().url(),
  REVALIDATE_SECRET: z.string().min(16),

  DNI_ENCRYPTION_KEY: z
    .string()
    .refine((v) => Buffer.from(v, 'base64').length === 32, 'Tiene que ser 32 bytes en base64'),
  DNI_KEY_VERSION: z.coerce.number().int().positive().default(1),
  DNI_ENCRYPTION_KEYS_ANTERIORES: opcional(), // "1:base64,2:base64" para rotación

  MP_ACCESS_TOKEN: opcional(),
  MP_WEBHOOK_SECRET: opcional(),

  RESEND_API_KEY: opcional(),
  MAIL_FROM: z.string().min(3),
  MAIL_ADMIN: z.string().email(),
  SMTP_DEV_HOST: opcional(),
  SMTP_DEV_PORT: z.coerce.number().int().default(1025),

  R2_ACCOUNT_ID: opcional(),
  R2_ACCESS_KEY_ID: opcional(),
  R2_SECRET_ACCESS_KEY: opcional(),
  R2_BUCKET: opcional(),
  R2_PUBLIC_URL: opcional(),
  // Sin R2 (desarrollo), las fotos se guardan en esta carpeta y la API las sirve en /uploads.
  UPLOADS_DIR: z.string().default('uploads'),
  // Fotos con ruta relativa en las planillas (las que baja el scraper).
  IMPORT_FOTOS_DIR: z.string().default('../data/import'),

  SENTRY_DSN: opcional(),
});

export type Config = z.infer<typeof esquema> & { esProduccion: boolean };

/** Lee y valida las variables de entorno. Si falta algo, el proceso no arranca. */
export function cargarConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const resultado = esquema.safeParse(env);
  if (!resultado.success) {
    const detalle = resultado.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Configuración inválida. Revisá el archivo .env:\n${detalle}`);
  }
  const config = resultado.data;
  if (config.NODE_ENV === 'production' || config.NODE_ENV === 'staging') {
    if (!config.RESEND_API_KEY) throw new Error('Falta RESEND_API_KEY fuera de desarrollo');
  }
  return { ...config, esProduccion: config.NODE_ENV === 'production' };
}

/** Claves de cifrado del DNI por versión: la actual más las anteriores (rotación). */
export function clavesDeCifrado(config: Config): Record<number, Buffer> {
  const claves: Record<number, Buffer> = {
    [config.DNI_KEY_VERSION]: Buffer.from(config.DNI_ENCRYPTION_KEY, 'base64'),
  };
  for (const par of (config.DNI_ENCRYPTION_KEYS_ANTERIORES ?? '').split(',').filter(Boolean)) {
    const [version, clave] = par.split(':');
    if (version && clave) claves[Number(version)] = Buffer.from(clave, 'base64');
  }
  return claves;
}
