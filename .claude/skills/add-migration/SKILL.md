---
name: add-migration
description: Change the database schema safely — add a table or column, and generate the migration. Use for any change under packages/core/src/schema.
---

# Changing the schema

## 1. Edit the schema

One table per file in `packages/core/src/schema/`. Every domain table spreads
`baseColumns`, which supplies `id`, `userId`, `createdAt`, `updatedAt`, `deletedAt`.
Do not omit these — `userId` is what makes multi-user a feature rather than a
refactor (`docs/adr/0002`), and `deletedAt` is what lets a deletion sync and be undone.

Conventions:

- `snake_case` column names in SQL, `camelCase` in TypeScript
- Timestamps are ISO strings, not integers — rows stay wire-shaped
- Add an index for any column you will filter or sort by; `sets` is the hot table

## 2. Generate the migration

```bash
pnpm db:generate
```

Commit the generated SQL. **Never hand-edit a migration that has already run** on a
device — write a new one.

## 3. Update everything that follows from it

A schema change is never only a schema change:

- `packages/contract` — the zod schema and the read model
- `packages/core/repository` — the interface and `LocalRepository`
- The feature README for the affected area
- Tests

## 4. Backward compatibility

From Phase 9 there are older app versions in the wild that talk to the same server:

- **Add** columns; never rename or remove them
- New columns are nullable, or have a default
- Migrations must be safe to run while old clients are live

Same discipline applies to OTA updates before Phase 9 — a device may skip versions.

## 5. Verify

```bash
pnpm db:check     # schema and migrations agree — CI runs this too
pnpm typecheck
```
