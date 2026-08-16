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

## Weekly volume by muscle

At the bottom of the screen: every muscle the seed library knows about,
grouped under a heading (Shoulders, Back, Arms, …), with one column per day —
zero-filled, so a muscle with nothing planned still shows as a row of zeros
rather than disappearing.

`computeMuscleVolume` (`@fitai/core`, `packages/core/src/routine/muscleVolume.ts`)
does the counting and is unit-tested there rather than here — it's a pure
function over a `RoutineOverview`, no React involved, same reasoning as
`backup/retention.ts`. Two rules worth knowing:

- **Only working, drop, and failure sets count.** Warmups and feelers are prep,
  not work — same exclusion GLOSSARY.md already applies to volume and PRs.
- **A set counts fully toward its exercise's `primaryMuscle`, never split across
  `secondaryMuscles`.** A shoulder press is programmed to overload the front
  delts; the side-delt activation it also produces is real but incidental, not
  equivalent to a dedicated side-delt set. Secondary involvement is tracked
  separately as "indirect" and shown as a small note, not merged into the
  muscle's main total — merging would inflate a muscle's apparent volume with
  sets that weren't actually driving overload for it.
