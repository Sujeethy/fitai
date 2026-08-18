---
name: add-feature
description: Scaffold a new feature folder with the project's conventions. Use when starting a distinct capability rather than extending an existing one.
---

# Adding a feature

Features are folders, not layers. Everything for one capability lives together, so
deleting it means deleting one directory.

## Structure

```
src/features/<feature-name>/
├── README.md          ← required, plain English
├── components/        ← presentational, one job each
├── hooks/             ← React Query reads and mutations
├── atoms/             ← Jotai state that is never persisted
└── types.ts           ← only if not already in @fitai/contract
```

## The README is not optional

Someone who doesn't code should understand what this feature does from it. Cover:

- What it does, in a sentence
- Which screens use it
- Which database tables it touches
- Anything surprising

## Conventions

- **Named exports only.** A lint rule enforces it; Expo Router screens are exempt.
- **Absolute imports** via `@/`. Never `../../../`.
- **Components hold layout, hooks hold logic.** A component that fetches,
  transforms, and renders is three things wearing one hat.
- Past ~150 lines, split the file. Past ~5 props, compose the component.
- **Never import `db` or Drizzle.** Add a repository method instead — a lint rule
  will stop you, and the rule is right.

## State

> React Query owns anything that lives in the database.
> Jotai owns anything that doesn't.

Query keys go in `src/data/queryKeys.ts` — never inlined.

## Wiring up

1. Add a route under `apps/mobile/app/`, keeping the screen file thin — layout only
2. Add query keys
3. Add repository methods for anything new
4. Write the README

## Before you finish

```bash
pnpm typecheck && pnpm lint && pnpm test
```
