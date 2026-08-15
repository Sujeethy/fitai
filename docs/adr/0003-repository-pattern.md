# 0003 — The repository is the only door to the data

**Status:** accepted

## Context

A backend arrives in Phase 9. Done naively, that means rewriting every component that
queries the database.

## Decision

All data access goes through `WorkoutRepository`. No screen, component, or hook may
import Drizzle or `db`. **Enforced by a lint rule**, not just documented.

Six supporting decisions, all costing nothing now:

1. **Every method is `async`**, though SQLite answers instantly — the network will
   not, and synchronous code now means changing every call site later.
2. **Wire-shaped data** — ISO date strings, plain objects, no class instances.
3. **`Result<T>` instead of throwing**, with `network`, `conflict`, and
   `unauthorized` variants declared but unreachable until Phase 9.
4. **Pagination in every list signature**; the local implementation ignores `cursor`.
5. **Client-generated UUIDs** — offline creates cannot wait for a server.
6. **Mutations shaped like endpoints** — `logSet(input)` maps to `POST /sets`.

## Consequences

- Several things look wrong in review: unreachable error variants, ignored
  pagination arguments, `await` over an instant local read. CLAUDE.md lists these
  explicitly so they are not "fixed".
- Phase 9 adds a sync engine rather than rewriting the UI.

## Rejected

- **Query Drizzle directly from components.** Simpler now, and it makes Phase 9 a
  rewrite.
- **Swap `LocalRepository` for `HttpRepository` in Phase 9.** This is the obvious
  design and it is wrong: it breaks offline logging, which is the entire point of the
  app. Local SQLite stays primary forever; sync happens underneath.
