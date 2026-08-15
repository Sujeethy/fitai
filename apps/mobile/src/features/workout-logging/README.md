# Workout logging

Logging sets during a session — the core loop, and the thing the whole app is
judged on.

**Screens:** `app/session/[id].tsx`
**Tables:** `sessions`, `session_exercises`, `sets`, `change_journal`

## The one idea

**Never show an empty form.** Opening an exercise pre-fills exactly what you'd
most likely do next, so the common case is confirmation rather than data entry.

`usePrefill` picks a value in this order:

1. The previous set in *this* session — most sets repeat the one before
2. What you did for this exercise last time
3. An empty bar, only if the exercise is new to you

## Speed decisions

- **Steppers, not a keyboard.** The value almost always moves by exactly one
  increment, and that increment is per-exercise: 2.5 kg for a bench press, 1 kg
  for a lateral raise, 5 kg for a deadlift. Long-press jumps five steps.
- **"Repeat last set"** logs an identical set in one tap.
- **The primary button sits at the bottom of the card**, in thumb reach — it's
  tapped three to five times per exercise while everything above it is tapped once.
- **Warmups are logged but excluded from prefill and from history**, since
  prefilling 20 kg when you squat 100 would be worse than showing nothing.

## Swapping

`SwapSheet` is the two-tap substitution flow. Substitutes you have actually used
before are ranked first, so the list learns your gym rather than staying generic.

Scope is always `today`: a busy machine changes today's session and nothing else.
Changing a saved routine is a separate, explicitly confirmed action — see
`docs/adr/0004-routine-versioning.md`.

## State

- **React Query** — sets, session detail, last performance (all in the database)
- **Jotai** — the draft weight/reps sitting in the steppers before you tap Log
