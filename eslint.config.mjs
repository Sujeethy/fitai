import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * The architectural invariants from CLAUDE.md, enforced here rather than merely
 * requested there.
 *
 * Documentation asks. Lint rules hold. Six months from now — or with an LLM making
 * changes that has not read the docs — these are what keep the structure intact.
 */
export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/dist/**', '**/.expo/**', '**/migrations/**'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    rules: {
      // Invariant 5 / general hygiene: no silent `any`.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      eqeqeq: ['error', 'smart'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  /**
   * INVARIANT 1 — only the repository touches the database.
   *
   * This is the load-bearing one. If a screen queries Drizzle directly, that line
   * has to be rewritten when the backend arrives in Phase 9, and the whole
   * repository design stops paying for itself.
   */
  {
    files: ['apps/mobile/app/**/*.{ts,tsx}', 'apps/mobile/src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'drizzle-orm',
              message:
                'Only packages/core/repository may query the database. Add a method to WorkoutRepository instead. See CLAUDE.md invariant 1.',
            },
            {
              name: '@/data/db',
              message:
                'Only packages/core/repository may touch `db`. Add a method to WorkoutRepository instead. See CLAUDE.md invariant 1.',
            },
          ],
          patterns: [
            {
              group: ['drizzle-orm/*', '**/data/db'],
              message:
                'Only packages/core/repository may touch the database. See CLAUDE.md invariant 1.',
            },
            {
              group: ['../../*'],
              message: 'Use the `@/` alias rather than deep relative imports.',
            },
          ],
        },
      ],
    },
  },

  /**
   * Named exports only — renames stay greppable, and auto-import stops inventing
   * names. Expo Router is the exception: it requires a default export per route.
   */
  {
    files: ['apps/mobile/src/**/*.{ts,tsx}', 'packages/**/src/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportDefaultDeclaration',
          message: 'Use named exports. (Expo Router screens under app/ are exempt.)',
        },
      ],
    },
  },

  // Config files and route files legitimately use default exports.
  {
    files: ['**/*.config.{js,ts}', 'apps/mobile/app/**/*.tsx'],
    rules: { 'no-restricted-syntax': 'off' },
  },

  // Build config is CommonJS and runs in Node — Metro and Babel require it.
  {
    files: ['**/*.config.js', '**/babel.config.js', '**/metro.config.js'],
    languageOptions: {
      globals: { module: 'writable', require: 'readonly', __dirname: 'readonly' },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);
