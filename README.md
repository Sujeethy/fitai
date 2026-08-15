# fitai

Offline-first gym logger for workouts and body weight — with an MCP server so any
LLM can read and write your training data, and an in-app chat that can ask several
LLMs at once and show the answers side by side.

**Status: planning.** No code yet. See **[PLAN.md](./PLAN.md)** for the architecture,
technology choices, and phase-by-phase development plan.

## The idea

- **Log fast.** Never an empty form — every exercise pre-fills with what you did last
  time. One tap to repeat a set, two taps to log body weight.
- **Log substitutions.** Leg press taken? Swap to hack squat in two taps, with the
  reason and date recorded as structured data — so later you can ask "what do I
  usually do when the leg press is busy?"
- **Works with no signal.** The gym is a basement. Everything writes locally and
  syncs when you're back online.
- **Your data, your disk.** A SQLite file you own. Designed from day one to move to
  the cloud later without a rewrite.
- **LLMs on tap.** Ask about your own training history, in the app, with your profile
  and workout data as context — and compare answers from several models at once.

## Planned stack

TypeScript throughout — React PWA, Hono core service, SQLite via Drizzle, and the
official MCP TypeScript SDK. Full reasoning in [PLAN.md](./PLAN.md#3-recommended-stack).

## Cost

₹0 to build and run through Phase 6, using free-tier LLM providers or a local
Ollama model. [Breakdown](./PLAN.md#12-what-this-costs-to-run).
