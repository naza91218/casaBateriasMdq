import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      'backend/db/migrations/**',
      'propuesta-deck/**',
      'prototipo-deck/**',
      '.impeccable/**',
      '.specify/**',
      '.claude/**',
      'data/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Scripts de carga de k6 (T150): corren en k6, que define estas variables globales.
    files: ['infra/carga/**/*.js'],
    languageOptions: { globals: { __ENV: 'readonly', __VU: 'readonly', __ITER: 'readonly' } },
  },
  {
    // El dominio es puro: no conoce la base, Fastify ni los adaptadores (constitución VII, SOLID-D).
    files: ['backend/src/modules/*/domain/**/*.ts', 'backend/src/shared-kernel/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/infrastructure/**', '**/http/**', '**/adapters/**', '**/platform/**'],
              message: 'El dominio no puede depender de infraestructura.',
            },
            {
              group: ['fastify', 'drizzle-orm', 'drizzle-orm/*', 'postgres'],
              message: 'El dominio no puede depender de frameworks ni de la base.',
            },
          ],
        },
      ],
    },
  },
  prettier,
);
