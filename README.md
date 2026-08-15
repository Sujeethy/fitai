# fitai

An offline-first gym logger for workouts and body weight. A React Native app on your
Android phone, with no backend, no running costs, and an LLM assistant that has your
actual training history as context.

**Status: Phase 0 complete.** The foundation is in place — schema, repository
interface, contract, app shell, CI. Phase 1 adds actual logging.

```bash
pnpm install
pnpm dev          # then scan the QR code with Expo Go
```

See **[PLAN.md](./PLAN.md)** for the architecture, technology choices, security
model, and phase-by-phase plan.

## The idea

- **Log fast.** Never an empty form — every exercise pre-fills with what you did last
  time. One tap to repeat a set, two taps to log body weight. Target: a full session
  in under 90 seconds of screen time.
- **No fixed program needed.** Repeat a previous session, build one ad hoc, or ask the
  LLM to generate one around the time and equipment you actually have.
- **Substitutions are first-class.** Leg press taken? Swap in two taps, with the reason
  and date stored as structured data — so later you can ask "what do I usually do when
  the leg press is busy?" and get a real answer.
- **Today ≠ forever.** An LLM change applies to today by default. Saved routines are
  only altered when you explicitly confirm it.
- **Undo anything.** Every change is journalled with actor and before/after state. One
  tap reverts an entire LLM turn.
- **Works with no signal.** Everything writes to local SQLite. The logging path never
  touches the network.
- **Your data, your phone.** A SQLite file in the app sandbox, backed up automatically
  to a Google Drive folder. No server, no account, nothing to pay for.

## Stack

TypeScript throughout — Expo / React Native, `expo-sqlite` with Drizzle, NativeWind,
LLM calls direct from the device, Health Connect for body weight, and an optional MCP
wrapper for desktop use. Reasoning in [PLAN.md](./PLAN.md#4-stack).

## Backend

There isn't one — the phone is the whole system, and it stays that way until Phase 9.
The schema, repository, and API contract are built for a backend from day one, so
adding it later is a sync engine rather than a rewrite.
[Why](./PLAN.md#5-built-now-so-the-backend-is-easy-later).

## Repo map

| Path | What's in it |
|---|---|
| `apps/mobile/` | The Expo app |
| `packages/core/` | Database schema, the repository interface, seed data |
| `packages/contract/` | Operation payloads and result types — the API, designed before it exists |
| `docs/ARCHITECTURE.md` | Flowcharts and the folder tree |
| `docs/DEPLOYMENT.md` | How a change reaches your phone |
| `docs/adr/` | Decisions, and what was rejected |
| `CLAUDE.md` | Invariants and conventions |

## Cost

₹0 for the entire plan, using free-tier LLM providers or a local Ollama model.
[Breakdown](./PLAN.md#14-what-this-costs).
