# 0004 — Routines are versioned; LLM changes default to today

**Status:** accepted

## Context

The question that prompted this: *"if I ask for a replacement today, will next week
show the regular routine or the modified one?"*

Two failure modes:

- Changes always permanent → one busy leg press machine silently rewrites the program.
- Changes never permanent → a genuine preference must be re-stated every session.

And a third, subtler one: editing a routine today makes *past* sessions look like
deviations from a plan that did not exist when they happened.

## Decision

Three layers: **routine** (template, versioned) → **session** (one day's instance) →
**substitution history** (informs suggestions, mutates nothing).

- Every LLM change carries an explicit `scope`, defaulting to `'today'`.
- `scope: 'routine'` requires `confirmed: true` — the repository rejects it otherwise.
- Routines are versioned; sessions reference the version they came from.
- After a repeated swap (4 of the last 5), the app *asks once* whether to promote it.
  Suggested, never automatic.

## Consequences

- "Leg press is busy" changes today only. Next week is unaffected.
- The confirmation gate is also the **security boundary against prompt injection** —
  text hidden in a screenshot cannot silently rewrite a program.
- History stays interpretable months later.

## Rejected

- **Free-text notes for substitutions.** Loses both exercises' identity, so
  "is my hack squat progressing as well as my leg press was?" becomes unanswerable.
- **Automatic promotion after N swaps.** Surprising, and it removes the user's
  judgement about *why* they were swapping.
