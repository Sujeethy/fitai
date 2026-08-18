# AGENTS.md

Instructions for Codex and other LLM agents working in this repository.
Humans should read this too — it's the shortest description of how the project works.

---

## What this is

**fitai** — an offline-first gym logger for workouts and body weight. React Native
(Expo), Android, single user today, multi-user later. Everything is stored in SQLite
on the phone. There is no backend yet, by design.

- **What we're building and why:** [PLAN.md](./PLAN.md)
- **Diagrams and folder layout:** [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- **Domain terms:** [docs/GLOSSARY.md](./docs/GLOSSARY.md)
- **Past decisions and what was rejected:** [docs/adr/](./docs/adr/)

**Read the relevant ADR before changing anything architectural.** Several obvious-looking
"improvements" were considered and deliberately declined; the ADRs say which and why.

---

## Invariants — do not break these

These are load-bearing. Breaking one causes damage that shows up much later.

**1. Only the repository touches the database.**
No screen, component, or hook imports `db` or Drizzle directly. Everything goes
through `WorkoutRepository`. This is what lets a backend be added in Phase 9 without
rewriting the app.

**2. Every repository operation is `async`, even though SQLite is instant.**
The network won't be. Synchronous code now means changing every call site later.

**3. Return `Result<T>`, never throw for expected failures.**
`AppError` already declares `network`, `conflict`, and `unauthorized` variants that
nothing produces yet. Leave them. They exist so Phase 9 adds `switch` cases instead
of retrofitting error handling.

**4. Every query is scoped by `user_id`, via `currentUserId()`.**
There is one local user today. A query that forgets scoping is a data leak the day
there are two.

**5. Data is wire-shaped.**
ISO date strings, plain JSON-serialisable objects. No `Date` instances, no classes, no
functions in anything that crosses the repository boundary.

**6. IDs are client-generated UUIDs.**
Never database autoincrement. Offline creates cannot wait for a server.

**7. Every mutation writes a `change_journal` entry with `before_json`.**
This is both the undo history and the sync outbox. A mutation that skips it is
invisible to undo _and_ will never sync.

**8. LLM changes default to `scope: 'today'`.**
Anything touching a saved routine requires explicit user confirmation through a diff
preview. This is a security boundary against prompt injection, not just a UX nicety.

**9. LLM tools are narrow and typed.**
No `delete_all`, no `execute_sql`, no general-purpose escape hatch. Every argument is
zod-validated before execution. Model output is untrusted input.

**10. API keys live in `expo-secure-store` only.**
Never in the database, never in `settings`, never in a backup file, never committed.

---

## State management

> **React Query owns anything that lives in the database.
> Jotai owns anything that doesn't.**

| State                                                         | Owner       |
| ------------------------------------------------------------- | ----------- |
| Sessions, sets, body weights, routines, chat threads          | React Query |
| Rest timer, draft set values, open sheets, selected providers | Jotai       |

Cache keys all live in `apps/mobile/src/data/queryKeys.ts`. Never inline a query key
string — mistyped keys cause invalidation bugs that are painful to trace.

Do **not** introduce Drizzle's `useLiveQuery` as a second read path. See
`docs/adr/0006-react-query-over-the-repository.md`.

---

## Code conventions

- **Feature-first folders.** New code goes in `src/features/<feature>/`, not in a
  global `components/` bucket.
- **Every feature folder has a `README.md`** in plain English: what it does, which
  screens use it, which tables it touches. Update it when behaviour changes.
- **Small components.** One job each. Past ~150 lines, split it. Past ~5 props,
  compose it.
- **Hooks hold logic, components hold layout.** A component that fetches, transforms,
  and renders is three things wearing one hat.
- **Named exports only.** No default exports — renames stay greppable.
- **Absolute imports** via `@/`. Never `../../../`.
- **React Compiler is enabled** (`babel-preset-expo` with `reactCompiler: true`). Components, hooks, and calculations are memoized automatically at build time. Do **not** write manual `useMemo`, `useCallback`, or `React.memo` unless required by external boundary constraints. Keep components pure and compliant with the Rules of React.
- **One file per LLM tool, one per provider, one per database table.**
- **No `any`.** If a type is genuinely unknown, use `unknown` and narrow it.

---

## Common tasks

Recipes live in `.agents/skills/`. Prefer them over improvising:

| Task                         | Skill              |
| ---------------------------- | ------------------ |
| Add an LLM provider          | `add-llm-provider` |
| Add something the LLM can do | `add-tool`         |
| Change the database schema   | `add-migration`    |
| Start a new feature folder   | `add-feature`      |

If you do a task more than twice and there's no skill for it, write one.

---

## Commands

```bash
pnpm install
pnpm dev              # Expo dev server
pnpm typecheck        # must pass before any commit
pnpm test
pnpm lint
pnpm db:generate      # generate a migration after a schema change
pnpm db:migrate
```

`pnpm typecheck` and `pnpm test` must both pass. Do not commit around a failing
typecheck.

---

## Working style in this repo

- **Read the ADRs before proposing architectural changes.** If you think a decision
  is wrong, say so and reference the ADR — don't silently do it differently.
- **Don't add dependencies casually.** Every package ships inside the APK with full
  app permissions. Prefer the standard library or an existing dependency.
- **Version policy: native packages follow the Expo SDK; everything else tracks
  latest.** Anything with native/Android code (`expo-*`, `react-native` itself,
  `react-native-reanimated`, `@sentry/react-native`, `@shopify/flash-list`, …) should
  be whatever `npx expo install` resolves for the installed Expo SDK — that is the
  combination Expo has actually tested, and a mismatch there is what causes an
  on-device crash `expo-doctor` exists to catch before a build does. Pure-JS
  dependencies (`drizzle-orm`, `@tanstack/react-query`, `zod`, `jotai`,
  `tailwindcss`, …) aren't tied to native ABI compatibility, so default to latest.
  If a native package's own latest genuinely outpaces what Expo's SDK currently
  lists (it happens — Expo's compatibility table lags real releases), keep latest
  and add it to `expo.install.exclude` in `apps/mobile/package.json` rather than
  downgrading; note why next to the exclusion, the way `.github/workflows/ci.yml`
  does for `@sentry/react-native` and `@shopify/flash-list`.
- **Don't build ahead of the current phase.** PLAN.md §16 has the order, and it's
  deliberate. Phases 1–4 are the product; the rest is optional.
- **When schema changes, update:** the schema file, a migration, the repository, the
  contract, and the affected feature README. All five, or the next reader is misled.
- **Prefer deleting to adding.** The smallest system that meets the requirement is the
  right one — that's the reasoning behind having no backend yet.

---

## Things that look like bugs but are deliberate

Ordered by how often they'd be "fixed" by mistake:

| Looks wrong                                                                              | Why it's right                                                                                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AppError` has variants nothing produces                                                 | Reserved for Phase 9. Removing them means retrofitting error handling later.                                                                                                                                                                                                                                        |
| Everything is `async` over an instant local database                                     | So call sites don't change when the network arrives.                                                                                                                                                                                                                                                                |
| `user_id` on every table with only one user                                              | So multi-user is a feature, not a refactor.                                                                                                                                                                                                                                                                         |
| `contract/` describes an API that doesn't exist                                          | The backend implements it in Phase 9. Designing it now means it's been exercised for months.                                                                                                                                                                                                                        |
| Pagination arguments the local implementation ignores                                    | Same reason.                                                                                                                                                                                                                                                                                                        |
| `packages/api` exists but is empty                                                       | Placeholder for Phase 9. Leave it.                                                                                                                                                                                                                                                                                  |
| `chat_threads` / `chat_messages` exist in the schema but nothing reads or writes them    | Reserved for Phase 6, the chat assistant. See the comment on `packages/core/src/schema/chat.ts`.                                                                                                                                                                                                                    |
| The routine is seeded from `packages/core/src/seed/routine.ts`, not entered in-app       | The app is routine-first (docs/adr/0007). Editing in-app is an open question (docs/NEXT.md §1) deliberately left for later — for now, changing the program means editing that file and reinstalling, since `ensureSeedRoutine` (`apps/mobile/src/data/migrate.ts`) only runs once, while `routines` is still empty. |
| `react-native-reanimated` listed though unused                                           | NativeWind needs it as a peer, so it is in the tree regardless. It also brings `react-native-worklets`, which supplies NativeWind's Babel plugin.                                                                                                                                                                   |
| `babel.config.js` inline-imports `.sql` **and** `metro.config.js` adds a `sql` sourceExt | Two halves of one mechanism — Drizzle's generated migrations are `.sql` files that must become strings at build time. Remove either and `migrate()` fails: without the Babel plugin Metro parses the SQL as JavaScript.                                                                                             |
| `@fitai/core/migrations` is a subpath export, not part of the root index                 | The root index is loaded by vitest in plain Node, where the `.sql` import has no Babel transform and throws. Only the app takes the migrations path.                                                                                                                                                                |
| `.npmrc` sets `node-linker=hoisted`                                                      | Metro cannot follow pnpm's symlinked layout — `@expo/metro-runtime` and other peers fail to resolve. Standard for Expo in a pnpm monorepo.                                                                                                                                                                          |
| `metro.config.js` sets `disableHierarchicalLookup = true`                                | Stops Metro walking _above_ the repo for modules. `expo-doctor` flags this and advises `false` — do not take that advice. There is an unrelated `node_modules` in the parent directory holding `react@18.2.0`; hierarchical lookup would let it shadow the real React 19.                                           |
| `app.config.ts` has no `newArchEnabled` flag                                             | From SDK 57 the New Architecture is the only architecture, so the opt-in was removed from `ExpoConfig`. Adding it back is a type error.                                                                                                                                                                             |

---

## Before starting new work

Read **[docs/NEXT.md](./docs/NEXT.md)** first. It carries the agreed direction, and
one correction that PLAN.md predates:

**The app is routine-first, not ad hoc.** PLAN.md was written assuming no fixed
training program. There is one — a 7-day cycle, Monday = Day 1, rest on Wednesday
and Sunday, varied only ~5–10% when equipment is busy. Anywhere PLAN.md or the schema
comments say "no fixed program", `docs/adr/0007-routine-first-training-model.md`
supersedes it. The schema, repository, and Today's checklist for this are built;
what's still open is listed in `docs/NEXT.md` §1's "open questions" — chiefly that the
routine's real content (the actual 7 days of exercises and targets) has not been
seeded, since fabricating that data would be indistinguishable in the app from the
real thing. `docs/NEXT.md` §§2–5 (visual design, charts, housekeeping, tooling) are
still agreed-but-unbuilt.
