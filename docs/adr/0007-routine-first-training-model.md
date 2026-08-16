# 0007 — The app is routine-first, not ad hoc

**Status:** accepted

## Context

The original brief said "no fixed program" — no gym visit follows a template, so
sessions were designed to be built one exercise at a time, with a saved routine as an
optional "save as routine" afterthought. That assumption is threaded through
PLAN.md, the schema comments, and `docs/GLOSSARY.md`'s definition of "plan of
record".

It was wrong. The actual training program is a fixed 7-day cycle — Monday = Day 1,
rest on Wednesday and Sunday — followed with only ~5–10% variation, when equipment is
busy or time is short. Building every session from a blank exercise list makes the
common case (repeat what the program says) the slow path, and the rare case (deviate
from it) the fast one. It should be the other way round.

`docs/NEXT.md` §1 has the full design; this record captures the decision and what it
does *not* change.

## Decision

**Today reads the routine, not the other way round.** A routine carries a
`cycleLength` and an `anchorDate`; Today computes `(daysSince(anchorDate) mod
cycleLength)` to find the day, and shows a checklist of that day's exercises with
their planned sets, instead of a blank "start a workout" screen.

Schema grows to match how prescriptive the real program is:

```
routines            + cycleLength, anchorDate, isActive
  routine_versions    (unchanged — versioning already correct, see ADR 0004)
    routine_days      dayIndex 0..cycleLength-1, name, isRestDay, warmupNote
      routine_exercises  now live under a day, not a version; gained `note`
                         for attachment/grip
        routine_sets     new — position, setType, targetWeightKg, targetReps,
                         targetNote, restSeconds

session_exercises   + routineExerciseId, carried through swaps, so a planned
                      exercise's targets stay attached to whatever replaces it
```

Two things worth keeping straight:

- **`cycleLength` + `anchorDate`, not weekday flags.** A 7-day cycle anchored to a
  Monday makes day 0 = Monday forever. A number expresses both a weekly split and a
  cycle that drifts through the calendar (some programmes want that); weekday flags
  only express the first.
- **Rest days are rows, not gaps.** A missing `routine_days` row for a given index is
  indistinguishable from a broken routine. A row with `isRestDay: true` is
  information Today can show ("rest day — log your weight instead").
- **The cycle is pinned to the calendar, not to attendance.** Skipping Tuesday does
  not push Wednesday to become "Day 2" — the next calendar day is still whatever the
  cycle says it is. Simpler, and matches a fixed weekly split; revisit if a
  drifting-on-miss programme is ever wanted.

## Consequences

- Today becomes a checklist most days: exercise and set counts, a warmup note, planned
  sets pre-filled with their targets. Tapping "Log" on a target hits it in one tap;
  the free-form steppers are still there for the set that doesn't match, or for
  anything added beyond the plan.
- **Ad hoc and generated sessions are not removed.** `startSession` with
  `origin: 'adhoc'` still exists and is the fallback whenever no routine is active —
  this is additive, not a replacement of the existing session-planning path.
- **Swap and promotion are unchanged.** `replaceExercise` still defaults to
  `scope: 'today'` and still requires `confirmed: true` for `scope: 'routine'` (ADR
  0004). The only change is that a swapped-in exercise now carries the original's
  `routineExerciseId` forward, so its planned-set targets keep showing.
- PLAN.md, `docs/GLOSSARY.md`, and the schema comments that said "no fixed program"
  are corrected to point here.
- **The routine's actual content is not seeded by this change.** No fabricated
  numbers are written to the database — see "Rejected" below.

## Rejected

- **Auto-seeding a placeholder routine.** It would be indistinguishable in the UI
  from the user's real program, and the actual 7-day, ~30-exercise, 77-set programme
  was not available data at the time this schema landed. Seeding it is follow-up
  work, done once with the real numbers, not fabricated ones.
- **A drifting cycle on a missed day.** Rejected for now (see "pinned to the
  calendar" above) — it's a bigger behavioural change than the schema needs to
  support today, and `dayIndex` computed purely from the calendar is simpler to
  reason about and to test.
- **Weekday flags instead of `cycleLength`.** Considered and declined in the original
  design pass in `docs/NEXT.md` §1 — see that file for the full reasoning.
