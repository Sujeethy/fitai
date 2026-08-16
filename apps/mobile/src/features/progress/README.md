# Progress

"Am I actually getting stronger?" — per-exercise estimated 1RM over time.
docs/NEXT.md §3 calls this "the single best 'am I progressing' view."

**Screen:** `app/account/progress.tsx`
**Tables:** `sets`, `session_exercises` (read-only, via `getExerciseHistory`)

## Pick an exercise, see its trend

The screen is a search-and-pick list (reusing `useExercises`, the same search
that matches aliases as `AddExerciseSheet` does) over the exercise library.
Selecting one loads `useExerciseHistory`, which reads every session the
exercise appears in via the repository's `getExerciseHistory` — the same
read `getLastPerformance` uses for "what did I do last time," extended to
span many sessions instead of one.

## Where the math lives

`computeOneRepMaxTrend` (`@fitai/core`, `packages/core/src/progress/oneRepMax.ts`)
turns that raw session history into one estimated-1RM point per session —
pure logic, unit-tested there rather than here, same reasoning as
`computeMuscleVolume`. Two things worth knowing:

- **Epley formula** (`weight × (1 + reps / 30)`), an estimate for tracking a
  trend, not a number to program a max-effort single from.
- **The "top set" is whichever set estimates highest, not whichever is
  heaviest.** Five reps at 80kg estimates higher than one rep at 82kg, and
  the estimate is what should actually drive the trend line.

Warmups are excluded at the repository layer, same reasoning as
`getLastPerformance` — they don't reflect what you were capable of that day.

## Not enough data yet

Fewer than two sessions and the chart doesn't draw — a single point has no
trend to show, and `EmptyState` says so instead of rendering a flat line.
