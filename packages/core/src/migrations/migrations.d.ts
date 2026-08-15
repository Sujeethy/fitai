/**
 * Types for the Drizzle-generated `migrations.js`, which is JavaScript and imports
 * `.sql` files that only exist as strings after Babel's inline-import transform.
 *
 * Deliberately NOT re-exported from `packages/core/src/index.ts`: that entry point is
 * loaded by vitest in plain Node, where the `.sql` import has no transform and would
 * throw. Import it as `@fitai/core/migrations` — a path only the app ever takes.
 */
declare const migrations: {
  journal: {
    entries: { idx: number; when: number; tag: string; breakpoints: boolean }[];
  };
  migrations: Record<string, string>;
};

export default migrations;
