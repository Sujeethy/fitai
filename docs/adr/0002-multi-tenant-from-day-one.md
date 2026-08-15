# 0002 — Multi-tenant schema from day one, auth much later

**Status:** accepted

## Context

There is one user today. A Play Store release is wanted eventually, which means real
accounts.

The instinct is to defer all of it (YAGNI). But the pieces differ sharply in how
expensive they are to retrofit:

| Item | Retrofit cost |
|---|---|
| `user_id` column | Low — one migration, backfill a single value |
| **Scoping every query by user** | **High — touches every query ever written, and a missed one is a data leak** |
| Auth subsystem | Additive |
| Server, sync | Additive, hard whenever done |

## Decision

Add `users` and `user_id` on every domain table now, and route every query through
`currentUserId()`. Build no auth, no server, no cloud database.

## Consequences

- `user_id` appears on every table with exactly one value in it. This looks like
  over-engineering and is not.
- The local user is seeded with `isLocal: true` and linked to a real account in
  Phase 9 rather than replaced, so history survives.
- Still ₹0, still offline, still no backend.
- Adding login becomes a feature rather than a refactor.

## Rejected

- **Defer everything.** The query-scoping retrofit is the one genuinely painful part,
  and it gets more painful with every query written.
- **Build auth now.** Does nothing until a second person exists, and auth built
  without a real use case tends to be wrong.
