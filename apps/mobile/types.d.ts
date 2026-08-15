/**
 * Ambient types that a clean checkout needs and does not have.
 *
 * Expo writes `expo-env.d.ts` as a side effect of running an `expo` command, and that
 * file is gitignored (see `.gitignore`) because it is generated. CI never runs an
 * `expo` command before `tsc`, so it never has those types.
 *
 * That was harmless until TypeScript 6, which added TS2882: a side-effect import such
 * as `import '../global.css'` in `app/_layout.tsx` is now an error unless a
 * declaration for it exists. Without this file, `pnpm typecheck` passes on a machine
 * that has run the dev server and fails in CI — the worst kind of difference.
 *
 * Hand-written and committed, so it is not regenerated and not ignored.
 */
/// <reference types="expo/types" />
