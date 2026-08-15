---
name: add-tool
description: Add a new capability the LLM can invoke — a tool in packages/tools. Use when the assistant needs to read or change something it currently cannot.
---

# Adding an LLM tool

Tools are the only way a model can touch your data, so the safety properties matter
more than the code. Work through these in order.

## 1. Decide whether it should exist

- **Does it need to be a tool at all?** If the model only needs to *know* something,
  add it to the context builder instead — that costs no round trip.
- **Is it narrow?** One clear job, typed arguments. Never a general-purpose
  escape hatch. There is deliberately no `execute_sql` and no `delete_all`.
- **Is it destructive or permanent?** Then it needs a confirmation gate (step 4).

## 2. Define the contract

In `packages/contract/src/schemas.ts`, add a zod input schema. It maps 1:1 to a
future HTTP endpoint, so name it as one.

Anything that changes a saved routine — or anything else persisting beyond today —
must carry `scope`, defaulting to `'today'`, plus `confirmed: boolean`.

## 3. Add the repository method

In `packages/core/src/repository/WorkoutRepository.ts`, then implement it in
`LocalRepository`. Async, returning `Result`. **Never touch the database from the
tool itself** — tools call the repository like everything else.

## 4. Confirmation gate for persistent changes

If `scope === 'routine'` and `confirmed !== true`, return
`err({ kind: 'conflict_state', reason: '…' })`. The UI then shows a diff and asks.

This is a security boundary, not a nicety: text hidden in a screenshot or an exercise
name could otherwise talk the model into rewriting your program.
See `docs/adr/0004-routine-versioning.md`.

## 5. Write the tool

One file in `packages/tools/src/`, registered in `registry.ts`. It should:

- Parse arguments with the zod schema — **model output is untrusted input**
- Call the repository
- Pass an `llmContext(userId, provider, toolName, batchId)`, sharing one `batchId`
  across the whole turn so undo reverts it as a unit
- Return a compact result; the model does not need whole rows

## 6. Test

- Valid arguments produce the expected change
- Invalid arguments return `validation`, and nothing is written
- A routine-scoped call without `confirmed` is rejected
- A journal entry was written with the right `batchId`, and undo reverses it

## 7. Update the docs

`PLAN.md` §10 if the tool surface changed materially, and the relevant feature README.
