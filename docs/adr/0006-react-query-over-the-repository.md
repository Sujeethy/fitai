# 0006 — React Query over the repository, not Drizzle live queries

**Status:** accepted

## Context

`drizzle-orm/expo-sqlite` offers `useLiveQuery`, which re-renders automatically when
the underlying table changes. For a local-only app that is simpler than React Query:
no cache keys, no manual invalidation.

## Decision

**React Query is the single read path**, wrapping the repository. Jotai holds UI
state that never reaches the database.

> React Query owns anything that lives in the database.
> Jotai owns anything that doesn't.

## Consequences

- Mutations must invalidate explicitly. All keys live in one `queryKeys.ts` — never
  inlined, because mistyped keys cause invalidation bugs that are miserable to trace.
- **Phase 9 costs nothing here.** The hooks call the repository, not the database,
  so a server changes neither.
- One mechanism for reading data, which is a large part of what keeps the codebase
  legible.

## Rejected

- **`useLiveQuery` as the main read path.** Simpler today; no story for a server,
  and it would have to be unpicked in Phase 9.
- **Both, side by side.** Two ways to read the same data is exactly the kind of thing
  that makes a codebase hard to follow. If a specific screen ever genuinely needs
  live queries, that warrants its own ADR.
