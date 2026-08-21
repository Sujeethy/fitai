# Next up

Everything agreed but not yet built, written so a fresh session can pick it up
without re-deriving the reasoning. Ordered by value.

**Where things stand:** Phases 0–1 complete — logging, swaps, body weight, history
with undo, backup and restore, crash reporting, OTA updates, **routine-first model
with 7-day cycle, Today checklist, and Routine tab with muscle breakdown**, a
**semantic color token layer**, and **body-weight and per-exercise-1RM charts**.
78 tests, CI green. See [PLAN.md](../PLAN.md) for the architecture.

---

## 1. Routines — the correction that matters most

> **Fully complete.** Schema, migration, repository (`getTodayPlan`, `getActiveRoutine`,
> `startRoutineSession`), Today's checklist, and a read-only Routine tab with
> weekly muscle volume breakdown — all shipped and working. See
> [docs/adr/0007](./adr/0007-routine-first-training-model.md).
> 
> **The real 7-day, 77-working-set program lives in**
> `packages/core/src/seed/routine.ts`, seeded on first launch via `ensureSeedRoutine`
> in `apps/mobile/src/data/migrate.ts`. Uses version-aware re-seeding (stored in
> `routine_version.changeNote`) so updating the program works on existing installs
> without mutating old versions.

### What's built

| Part | Location | Status |
|---|---|---|
| Schema — 7-day cycle, per-set targets, warmup/feeler sets, rest time | `packages/core/src/schema/routine.ts` | ✓ |
| Real program — all 77 working sets, single-stack cable movements | `packages/core/src/seed/routine.ts` | ✓ |
| Repository methods — cycle math, today's plan, active routine | `packages/core/src/repository/types.ts` + `*Repository` impls | ✓ |
| Today checklist — pre-filled, one-tap logging, progress ring | `apps/mobile/app/(tabs)/today.tsx`, `WorkoutSessionScreen` | ✓ |
| Routine tab — all 7 days with expand/collapse, muscle breakdown | `apps/mobile/app/(tabs)/routine.tsx`, `RoutineDayCard`, `MuscleVolumeTable` | ✓ |
| Navigation — 3 bottom tabs (Today/Routine/Weight); History/Backup in Account | `apps/mobile/app/(tabs)`, Account screen | ✓ |
| Muscle volume — primary-muscle counting, secondary as "+N indirect" | `packages/core/src/routine/muscleVolume.ts` | ✓ |

**Today** shows the day's checklist with exercise targets pre-filled:

```
Day 1 · Balanced Push
6 exercises · 17 sets · Progress: 0/17
⋮ Seated Machine Chest Press     [Swap]
  🟡 Warm-up  20.00 kg × 12      [Log] rest 60s
  🔵 Working  22.50 kg × 12      [Log] rest 90s
  🔵 Working  22.50 kg × 12      [Log] rest 90s
```

**Routine tab** lists all 7 days (collapsible cards), plus:

```
Weekly volume by muscle
Shoulders   1  2  3  0  4  0  0
  Front delts  2  0  3  0  1  0  0
  +1 indirect
Back        3  0  2  0  3  0  0
…
```

Warmups and feelers excluded from volume; only working sets count. Secondary
muscle involvement shown as footnotes, never merged into the primary total.

### Versioning — re-seeding without mutation

`SEED_ROUTINE.version` tags the program in `routine_version.changeNote` when
seeded. On app launch, `ensureSeedRoutine` checks: if the version is newer than
what's in the database, create a *new* `routine_version` with the updated program.
Old sessions stay pinned to their original version. Changing `seed/routine.ts` and
reinstalling automatically seeds the new program.

### Open: in-app editing

Still deferred. Editing a routine requires a diff preview, versioning on save,
and deciding what happens to a session already generated from the old version.
Simpler approach for now: change the program by editing `seed/routine.ts` and
letting version-aware re-seeding handle the rest. Revisit if the program changes
often enough to justify in-app editing.

---

## 2. Visual design

> **Token layer built, and every screen converted.** `apps/mobile/src/shared/theme/colors.ts`
> defines semantic tokens (`surface`, `surfaceRaised`, `surfaceOverlay`, `border`,
> `accent`, `success`, `warning`, `danger`, `textPrimary`, `textSecondary`,
> `textMuted`, `textFaint`, `textInverse`, plus pressed-state and rare-variant
> tokens like `accentStrong`, `dangerMuted`, `textDim`, `textFaintest`),
> mirrored as Tailwind utility classes in `apps/mobile/tailwind.config.js`
> (kept in sync by hand — Node loads the Tailwind config directly, so it
> can't import the TS module). The whole app — every feature component and
> screen, not just the shared ones — uses semantic classes now; nothing
> hardcodes `bg-neutral-900` or `text-emerald-400` anymore. What's below is
> the visual-design work the token layer *enables* but doesn't do on its
> own — layout, type scale, and elevation, not just color naming.

The current look still reads as a placeholder even with the tokens in place:
emerald on near-black, one accent, no real type or elevation scale. It needs
to read like a real fitness app.

The restyle pass from here is layout and hierarchy, not color plumbing:
tune the token *values* in one place if the palette itself needs work, then
use the Design plugin's `design-critique` skill to check the result reads as
intentional rather than just competently colored.

Direction worth taking from apps in this category (Strong, Hevy, Whoop):

- **A neutral dark base with one saturated accent**, used sparingly — for the
  primary action and progress only, not for every heading
- **Type scale that does the work** — large tabular numbers for weights, small
  muted labels. Weight is the thing you read mid-set; it should dominate
- **Cards with real elevation**, not just a border
- **Progress as a ring or bar** on the session header — "11 / 17 sets"
- Green reserved for *completed*, accent for *actionable*

The **Design plugin** in the plugin catalog (`design:design-system`,
`design:design-critique`, `design:accessibility-review`) is the right tool for
this pass — it was not enabled during the work so far.

---

## 3. Charts

> **Body weight and per-exercise 1RM built.** `victory-native` (Skia-backed) is
> installed, pinned to Expo SDK 57's compatibility table
> (`@shopify/react-native-skia@2.6.2`; `react-native-gesture-handler` pinned to
> the version `expo-router` already pulls in transitively, excluded from
> `expo-doctor`'s version check the same way `@sentry/react-native` and
> `@shopify/flash-list` are — see `apps/mobile/package.json`).

| Chart | Status | Where |
|---|---|---|
| **Body weight**, 7-day average line over raw dots | Built | `BodyWeightChart`, Weight tab |
| **Per-exercise estimated 1RM** over time | Built | `OneRepMaxChart`, Account → Progress (pick an exercise, see its trend) |
| **Weekly volume per muscle group** | Already satisfied by the muscle volume **table** on the Routine tab (§1) — grouped by muscle, zero-filled per day. A bar-chart rendering of the same data is optional polish, not attempted yet. |

`getExerciseHistory` (new repository method, `packages/core/src/repository/local/sets.ts`)
returns every session an exercise appears in; `computeOneRepMaxTrend`
(`packages/core/src/progress/oneRepMax.ts`, unit-tested) turns that into one
estimated-1RM point per session using the Epley formula, picking whichever set
in a session estimates highest — not necessarily the heaviest weight.

Keep them readable at a glance: no legends where a label will do, no gridlines
competing with the data.

---

## 4. Housekeeping

The user asked that nothing stale be left behind. Audited — all done:

- **`chat_threads` / `chat_messages`** — kept, with a comment on the schema
  explaining they're reserved for Phase 6. Nothing left unexplained.
- **`session_planning` feature folder** — its README documents the
  routine-first model and the fold-in/grow decision explicitly (§ "Growth
  note"), so a future session doesn't have to re-derive it.
- **`Screen`, `EmptyState`** — converted to theme tokens along with `Button`,
  `Stepper`, `AccountButton` when the token layer landed (§2).
- **`docs/adr/0004`** — turned out to be about routine *versioning*, not the
  "no fixed program" claim, so it didn't need superseding. ADR 0007 already
  covers the routine-first correction.
- **PLAN.md §7 and §19** — corrected when the token layer / routine-first
  docs were updated.

---

## 5. Tooling

Checked the plugin catalog for what was asked about:

| Asked for | Found |
|---|---|
| **superpowers** | Not in this catalog — a community plugin from another marketplace |
| **context7** | Same — not available here |
| **frontend design** | **Yes** — the official **Design** plugin, not currently enabled |

The Design plugin bundles `design-system`, `design-critique`,
`accessibility-review`, `ux-copy`, and a Figma MCP server. Worth enabling before
the visual pass in §2.

For up-to-date library documentation (which is what context7 is usually wanted
for), `WebSearch` and `WebFetch` are already available and were used to check
Expo's pricing earlier.

---

## Open questions

1. **When should the seeded routine be edited in-app?** Deferred. The Routine tab
   (`src/features/routine-view/`) is read-only for now — changing the program
   means editing `seed/routine.ts` directly and letting version-aware re-seeding
   handle the rest. That's fine for a program that changes rarely; revisit if it
   turns out to change often.
2. **What happens on a missed day?** Decided: the cycle stays **pinned to the
   calendar** — `getTodayPlan` computes the day purely from `anchorDate` and
   today's date, so a skipped Tuesday does not push Wednesday to "Day 2". Simpler,
   and matches a fixed weekly split. Revisit if a drifting-on-miss programme is
   ever wanted (see ADR 0007's "Rejected").
