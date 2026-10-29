import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: { name: 'unit', include: ['tests/unit/**/*.test.ts'], environment: 'node' },
      },
      {
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          environment: 'node',
          setupFiles: ['tests/setup/integracion.ts'],
          // Cada archivo usa la base de pruebas recreada; en serie para no pisarse.
          fileParallelism: false,
          testTimeout: 20000,
        },
      },
      {
        test: {
          name: 'contract',
          include: ['tests/contract/**/*.test.ts'],
          environment: 'node',
          setupFiles: ['tests/setup/integracion.ts'],
          fileParallelism: false,
          testTimeout: 20000,
        },
      },
    ],
  },
});
