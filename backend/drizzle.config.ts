import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/platform/schema.ts',
  out: './db/migrations',
  casing: 'snake_case',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://casa:casa@localhost:5433/casa_dev',
  },
  strict: true,
  verbose: true,
});
