# Next up

Everything agreed but not yet built, written so a fresh session can pick it up
without re-deriving the reasoning. Ordered by value.

**Where things stand:** Phases 0 and 1 are complete and pushed — logging, swaps,
body weight, history with undo, backup and restore, crash reporting, OTA updates.
50 tests, CI green. See [PLAN.md](../PLAN.md) for the architecture.

---

## 1. Routines — the correction that matters most

> **Built.** Schema, migration, repository (`getTodayPlan`, `startRoutineSession`),
> and the Today checklist UI all exist — see
> [docs/adr/0007](./adr/0007-routine-first-training-model.md). What's still open:
> the routine's real content is not seeded (deliberately — see ADR 0007's
> "Rejected"), and open question 2 below (missed-day behaviour) was decided as
> "pinned to the calendar" but not revisited since.

**The problem:** the app currently makes you add every exercise, every session.
For a fixed 7-day routine that is ~6 exercises × 7 days of data entry, forever.

**Why it's wrong:** early on the brief said "no fixed program", so sessions were
built ad hoc and routines were an optional "save as routine" afterthought. The
real pattern is the opposite — **a fixed 7-day cycle, varied maybe 5–10% when
equipment is busy or time is short.**

### The schema gap

The routine that needs to fit is far more prescriptive than what exists:

| The routine specifies | Schema has today |
|---|---|
| A **7-day cycle**, Monday = Day 1, rest on Wed and Sun | No cycle concept at all |
| **Per-set targets** — "Working Set 1: 22.50 kg × 12" | Only `targetSets` + a rep range for the whole exercise |
| **Warmup and feeler sets** as planned rows | Set types exist, but not as *planned* rows |
| **Rest per set** — 60s / 90s / 120s | Nothing |
| Attachment and grip notes — "single cable stack, rope" | Nothing |

### Tables to add

```
routines            + cycleLength (7), anchorDate (a Monday), isActive
  routine_versions    (unchanged — versioning already correct)
    routine_days      dayIndex 0-6, name, isRestDay, warmupNote
      routine_exercises  moves under a DAY rather than a version;
                         gains `note` for attachment/grip
        routine_sets     NEW — position, setType, targetWeightKg,
                         targetReps, targetNote, restSeconds
```

Two decisions worth keeping:

- **`cycleLength` + `anchorDate`, not weekday flags.** A 7-day cycle anchored to a
  Monday makes Day 1 = Monday forever. A 5-day cycle would drift through the week,
  which is what some programmes want — a number expresses both, weekday flags
  only express one.
- **Rest days are rows, not gaps.** "Rest day" is information the Today screen
  should show. A missing row is indistinguishable from a broken routine.

`routine_sets.targetWeightKg` is nullable — the plan says "empty sled" and
"bodyweight" in places, and `targetNote` carries "to complete failure, 0 RIR".

### Seed the real routine

Enter all 7 days from the programme in chat history — ~30 exercises, 77 working
sets, Monday anchored. Several exercises are missing from the seed library and
need adding:

Smith machine (incline, close-grip), plate-loaded lat pulldown, chest-supported
row (both horizontal and vertical grip), converging machine chest press, machine
lateral raise, reverse pec dec, hack squat sled, hyperextensions, cable
woodchoppers, wrist curls, incline dumbbell curl, single-arm cable lateral raise
(and the behind-the-back variant).

**Every cable movement in the programme uses a single stack** — deliberate, because
occupying two cable towers in a crowded gym is antisocial. Keep that property when
suggesting substitutes: never propose a dual-cable movement as a stand-in.

### The UI

**Today becomes a checklist, not a blank page.** It computes the cycle position
from `anchorDate` and shows:

> **Day 1 · Balanced Push** — 6 exercises · 17 sets
> *5 min arm circles and light shoulder rotations*
> \[ Start ]

On a rest day it says so, and offers to log body weight instead.

Tap Start and every exercise is present with its planned sets:

```
Seated Machine Chest Press                    [Swap]
  Warm-up   20.00 kg × 12    ✓ 20.00 × 12
  Warm-up   40.00 kg ×  8    [ Log ]
  Working   22.50 kg × 12    [ Log ]      rest 120s
  Working   22.50 kg × 12    [ Log ]
```

- Each row's **Log** pre-fills that exact target — one tap when you hit it, adjust
  the steppers when you don't
- **You never type an exercise name**
- The rest timer starts from that set's planned rest
- A progress ring shows sets done / sets planned

### What already works and should not be rebuilt

- **Swap** — the two-tap substitution flow, still today-only
- **Promotion** — after repeated identical swaps, offer to fold it into the
  routine. That is the "if I like it I may add it to the original" case, and
  `docs/adr/0004` already covers why it asks rather than acting
- **Extra work** — anything beyond the plan is still just an added exercise

---

## 2. Visual design

The current look is placeholder: emerald on near-black, one accent, no scale.
It needs to read like a real fitness app.

**Build a token layer first** — `src/shared/theme/` with semantic names
(`surface`, `surfaceRaised`, `accent`, `success`, `warning`, `textPrimary`,
`textMuted`) rather than Tailwind colours inline. Every screen currently hardcodes
`bg-neutral-900` and `text-emerald-400`; that is why the theme cannot be changed
in one place. Do the token layer before any restyling, or the restyle has to
happen twice.

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

`victory-native` is already the planned library (Skia-backed, smooth) but is not
yet installed. Three charts earn their place:

| Chart | Why |
|---|---|
| **Body weight**, 7-day average line over raw dots | The trend is the signal; the dots show the noise it smooths |
| **Per-exercise estimated 1RM** over time | The single best "am I progressing" view |
| **Weekly volume per muscle group** | Catches an imbalance the log alone hides |

Keep them readable at a glance: no legends where a label will do, no gridlines
competing with the data.

---

## 4. Housekeeping

The user asked that nothing stale be left behind. Audit before the next release:

- **`chat_threads` / `chat_messages`** exist in the schema but nothing uses them
  until Phase 6. Either keep with a comment saying so, or drop and re-add — do
  not leave them unexplained.
- **`session_planning` feature folder** holds only `AddExerciseSheet`. Once
  routines land, it either grows into the routine picker or the sheet moves to
  `workout-logging`.
- **`Screen`, `EmptyState`** components predate the theme layer and will need
  rewriting with tokens.
- **`docs/adr/0004`** says "no fixed program" is a settled decision. That is now
  wrong — it needs superseding with an ADR recording the routine-first model.
- **PLAN.md §7 and §19** both state "no fixed program". Same correction.

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

1. **Should the seeded routine be editable in-app**, or is editing it a
   later phase? Seeding it read-only is much less work and probably enough at
   first. Still open — no routine is seeded yet at all (see §1).
2. **What happens on a missed day?** Decided for now: the cycle stays **pinned to
   the calendar** — `getTodayPlan` computes the day purely from `anchorDate` and
   today's date, so a skipped Tuesday does not push Wednesday to "Day 2". Simpler,
   and matches a fixed weekly split. Revisit if a drifting-on-miss programme is
   ever wanted (see ADR 0007's "Rejected").
3. **What is the routine's actual content?** The real 7-day, ~30-exercise, 77-set
   programme referenced above was not available data when the schema landed — it
   needs to come from the user, then be inserted once with real numbers. Until
   then Today has no active routine and the app behaves exactly as it did before
   this section, via the ad-hoc fallback.
