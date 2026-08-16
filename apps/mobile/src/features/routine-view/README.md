# Routine view

Shows the active routine's full 7-day cycle — what Today reads from, laid out
day by day so you can check tomorrow's plan or what a later day looks like.

**Screens:** `app/(tabs)/routine.tsx`
**Tables:** `routines`, `routine_versions`, `routine_days`, `routine_exercises`,
`routine_sets` (read-only)

## Read-only, deliberately

Editing a routine in-app is real work — a diff preview, versioning on save,
figuring out what happens to a session already generated from the old version.
docs/NEXT.md §1 leaves it as an open question whether that's worth building
before something simpler (re-seeding via a script when the program changes).
This folder only reads.

## What it shows

Each day collapses to its shape — exercise and set counts, or "Rest day" — and
expands to the full line-by-line plan: every set's type, target weight × reps,
and rest time. Today's day is marked, using the same `getTodayPlan` cycle math
as the Today screen, not a separate calculation.

## No active routine

If `useActiveRoutine()` returns `null`, the screen says so rather than
rendering empty cards — the same "go ad hoc" fallback the Today screen uses
when nothing is seeded yet.
