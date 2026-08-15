# Glossary

Domain terms used throughout the code and docs. If you don't lift, start here —
none of this is inferable from reading the source.

## Training terms

| Term | Meaning |
|---|---|
| **Set** | One continuous run of repetitions. "3 sets of 8" means you did 8 reps, rested, and repeated that three times. |
| **Rep** | One repetition of a movement. |
| **RPE** | *Rate of Perceived Exertion*, 1–10. How hard a set felt. 8 means "could have done 2 more reps". Optional, but it's the best signal for whether you're recovering. |
| **Working set** | A real set at your target weight. |
| **Warmup set** | A lighter set before the working sets. Recorded but excluded from volume and PR calculations. |
| **Drop set** | Immediately reducing the weight and continuing after failure. |
| **PR** | Personal record — the most weight, or the most reps at a weight, for one exercise. |
| **Volume** | Weight × reps × sets. The usual proxy for how much work a session did. |
| **Compound** | A lift using several joints — squat, bench, deadlift. Larger weight jumps (2.5–5 kg). |
| **Isolation** | A single-joint lift — lateral raise, curl. Smaller jumps (1 kg), which is why `incrementKg` is per-exercise. |
| **Deload** | A deliberately lighter week to recover. |

## fitai concepts

| Term | Meaning |
|---|---|
| **Session** | One gym visit. Has a date, an origin, and a list of exercises with their sets. |
| **Origin** | How a session was started: `repeat` (re-run a previous one), `adhoc` (build as you go), `routine` (from a saved template), `generated` (the LLM proposed it). |
| **Plan of record** | The exercise list snapshotted when a session starts. Without it, a substitution has nothing to deviate *from* — which matters here because there is no fixed program. |
| **Substitution** | Doing exercise B where the plan said A — usually because the machine was occupied. Stored as a normal exercise row that remembers `planned_exercise_id` and a reason, so both exercises keep their identity and remain queryable. |
| **Scope** | Whether a change applies to `today` only, or to the saved `routine` from now on. **Always defaults to `today`.** A `routine` change requires explicit confirmation. |
| **Routine** | An optional saved template. Versioned, so editing it today doesn't make past sessions look like deviations. |
| **Promotion** | When you've made the same swap repeatedly, the app asks *once* whether to make it the routine default. Suggested, never automatic. |
| **Change journal** | Every mutation, with who made it and the state before and after. Powers undo — and, from Phase 9, doubles as the sync outbox. |
| **Batch** | A group of changes reverted together. One LLM turn is one batch, so "undo that" reverts the whole instruction rather than one change at a time. |
| **Source** | Where a body-weight reading came from: `manual`, `health_connect`, `llm`, or `import`. Tracked per reading because Fitelo's Health Connect accuracy is unverified — a manual entry always wins for the same date. |

## Technical terms

| Term | Meaning |
|---|---|
| **Repository** | The only code allowed to touch the database. Everything else calls it. This is what lets a backend be added later without rewriting the app. |
| **Contract** | The shape of every operation and payload, defined before the API exists, so Phase 9 implements something already designed. |
| **Outbox** | The queue of local changes not yet sent to a server. Here it's the change journal with `synced_at IS NULL`. |
| **Result** | The return type of every repository call: either `ok` with data, or an error. Failures are values, not exceptions. |
| **Soft delete** | Rows are marked `deleted_at` rather than removed, so deletions can sync and can be undone. |
| **OTA update** | An over-the-air JavaScript update, delivered without reinstalling the app. Covers ~95% of changes. |
| **Development build** | A custom build of the app that includes native modules Expo Go doesn't ship. Needed from Phase 5 for Health Connect. |
| **Health Connect** | Android's shared health data store. If Fitelo writes body weight there, fitai can read it with your permission. |
