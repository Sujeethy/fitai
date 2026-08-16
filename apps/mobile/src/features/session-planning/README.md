# Session planning

Starting a workout. The app is routine-first (docs/NEXT.md §1, ADR 0007): most days
Today already knows what you're doing, computed from the active routine's cycle.
This folder covers the fallback paths for everything else.

**Screens:** `app/(tabs)/index.tsx`
**Tables:** `sessions`, `session_plan`, `routines`, `routine_versions`, `routine_days`,
`routine_exercises`, `routine_sets`

## Four ways to start

| Mode | What it does |
|---|---|
| **From a routine** | The default when a routine is active. Today shows the day's checklist and a Start button — see `workout-logging`, which renders it. |
| **Repeat** | Re-runs a previous session, prefilled. |
| **Ad hoc** | Empty session, add exercises as you go. The fallback when no routine is active. |
| **Generated** | The LLM proposes one — Phase 6 |

## The plan of record

Whichever mode you start in, the initial exercise list is snapshotted into
`session_plan`. That snapshot is what makes substitutions meaningful: a swap needs
something to have been *planned*, and an ad-hoc day would otherwise have no
baseline to deviate from. A routine-started session also links each
`session_exercises` row back to the `routine_exercises` row it came from
(`routineExerciseId`), which is what lets the checklist show planned-set targets and
keeps them attached even after a swap.

## Growth note

`AddExerciseSheet` here still only covers the ad-hoc path. If this folder grows a
routine picker (choosing which routine day to start, outside of Today's default),
it belongs here; if it stays this thin, it should fold into `workout-logging`
instead. See docs/NEXT.md §4.
