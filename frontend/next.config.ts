import type { NextConfig } from 'next';
import { fileURLToPath } from 'node:url';

// En desarrollo el navegador llama a /api/v1 en el mismo dominio y Next lo pasa a la API.
// En staging y producción eso lo hace Nginx, antes de llegar a Next.
const API = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';

const config: NextConfig = {
  transpilePackages: ['@casa/shared'],
  // La imagen de Docker lleva solo el servidor mínimo (.next/standalone); la raíz del monorepo
  // para que incluya @casa/shared.
  output: 'standalone',
  outputFileTracingRoot: fileURLToPath(new URL('..', import.meta.url)),
  poweredByHeader: false,
  devIndicators: false,
  async rewrites() {
    return [{ source: '/api/v1/:ruta*', destination: `${API}/api/v1/:ruta*` }];
  },
};

export default config;
