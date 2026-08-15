# Session planning

Starting a workout when you don't follow a fixed program.

**Screens:** `app/(tabs)/index.tsx`
**Tables:** `sessions`, `session_plan`

## Four ways to start

| Mode | What it does |
|---|---|
| **Repeat** | Re-runs a previous session, prefilled. Likely the default. |
| **Ad hoc** | Empty session, add exercises as you go |
| **From a routine** | If you've saved one. Optional, never required. |
| **Generated** | The LLM proposes one — Phase 6 |

## The plan of record

Whichever mode you start in, the initial exercise list is snapshotted into
`session_plan`. That snapshot is what makes substitutions meaningful: a swap needs
something to have been *planned*, and an ad-hoc day would otherwise have no
baseline to deviate from.
