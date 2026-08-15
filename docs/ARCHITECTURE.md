# Architecture

How fitai is put together, in diagrams and folder listings.

If you don't write code, **§1, §2 and §7 are the ones to read** — they explain what
the pieces are and where things live, in plain English.

For *why* these choices were made, see [PLAN.md](../PLAN.md).
For rules when changing code, see [CLAUDE.md](../CLAUDE.md).

---

## 1. The system, today and later

Today everything runs on your phone. There is no server anywhere.

```mermaid
flowchart TB
    subgraph Phone["Your Android phone — the entire system"]
        direction TB
        SCREENS["Screens<br/>what you see and tap"]
        LOGIC["Feature logic<br/>rest timer, swap flow, chat"]
        REPO["Repository<br/>the only door to the data"]
        DB[("SQLite database<br/>your workouts and weights")]
        JOURNAL[("Change journal<br/>every edit, so you can undo")]
        BACKUP[["Backups → Google Drive folder"]]

        SCREENS --> LOGIC --> REPO
        REPO --> DB
        REPO --> JOURNAL
        DB --> BACKUP
    end

    SCREENS -.->|"only when you use chat"| LLM["LLM providers<br/>Gemini · Groq · OpenRouter"]
    HC["Health Connect<br/>body weight from other apps"] -.-> REPO
```

Later, a server is added **underneath** — the app keeps writing to the phone first, so
it still works with no signal. A background sync engine catches the server up.

```mermaid
flowchart TB
    subgraph Phone["Phone — unchanged"]
        SCREENS["Screens"] --> REPO["Repository"]
        REPO --> DB[("SQLite")]
        REPO --> OUT[("Outbox<br/>= the change journal")]
    end

    OUT --> SYNC["Sync engine<br/>runs in the background"]
    SYNC <-->|"HTTP, when online"| API["Backend API<br/>Hono + TypeScript"]
    API --> PG[("Postgres<br/>shared database")]
    API --> AUTH["Login<br/>Better Auth"]

    style SYNC stroke-dasharray: 5 5
    style API stroke-dasharray: 5 5
    style PG stroke-dasharray: 5 5
    style AUTH stroke-dasharray: 5 5
```

**The screens never change when the server arrives.** That's the point of the
repository in the middle — see §3.

---

## 2. The layers

Each layer only talks to the one below it. That's what keeps changes contained.

```mermaid
flowchart TD
    L1["<b>Screens</b> — apps/mobile/app/<br/>One file per screen. Layout only."]
    L2["<b>Features</b> — src/features/<br/>Components, hooks, and UI state for one capability"]
    L3["<b>Data hooks</b> — React Query<br/>Caching, loading states, refetching"]
    L4["<b>Repository</b> — packages/core<br/>The only code allowed to touch the database"]
    L5["<b>Drizzle ORM</b><br/>Typed SQL, one schema for phone and server"]
    L6[("<b>SQLite</b> — the file on your phone")]

    L1 --> L2 --> L3 --> L4 --> L5 --> L6

    JOTAI["<b>Jotai</b><br/>UI state that is never saved:<br/>timer, drafts, open sheets"]
    L2 <--> JOTAI
```

**The rule that makes this work:** nothing above the repository knows *where* data
lives. Swap SQLite for a server and layers 1–3 don't notice.

### Who owns which state

| State | Owner | Example |
|---|---|---|
| Anything stored in the database | **React Query** | Past sessions, sets, body weights, routines |
| Anything not stored | **Jotai** | Rest timer countdown, which sheet is open, draft values, selected LLM providers |

---

## 3. Logging a set — the most common action

```mermaid
sequenceDiagram
    actor You
    participant Screen as Session screen
    participant Q as React Query
    participant Repo as Repository
    participant DB as SQLite

    You->>Screen: Tap "Repeat set"
    Screen->>Q: mutate(logSet)
    Q-->>Screen: show optimistically, instantly
    Q->>Repo: repo.logSet(input)
    Repo->>Repo: validate with zod
    Repo->>DB: INSERT into sets
    Repo->>DB: INSERT into change_journal<br/>(synced_at = null)
    Repo-->>Q: Result.ok(set)
    Q->>Q: invalidate ['session', id]
    Q-->>Screen: re-render with real data
```

Two things worth noticing:

- **No network anywhere.** This is why the app works in a basement gym.
- **Every write also lands in the change journal**, which is both your undo history
  and — later — the queue the sync engine drains.

---

## 4. Asking the LLM to swap an exercise

```mermaid
sequenceDiagram
    actor You
    participant Chat as Coach screen
    participant Ctx as Context builder
    participant DB as SQLite
    participant LLM as LLM provider
    participant Tools as packages/tools

    You->>Chat: "Leg press is busy, what instead?"
    Chat->>Ctx: build context
    Ctx->>DB: profile, recent sessions, PRs, past swaps
    Ctx-->>Chat: compact context block
    Chat->>LLM: messages + tool definitions
    LLM-->>Chat: call replace_exercise(scope: "today")
    Chat->>Tools: validate arguments with zod

    alt scope = "routine" (permanent)
        Tools-->>You: show a diff, wait for approval
        You-->>Tools: approve or reject
    end

    Tools->>DB: apply change + write journal entry
    Tools-->>LLM: tool result
    LLM-->>Chat: "Hack squat — you've used it 4 times before"
    Chat-->>You: answer, with an Undo button
```

**The safety gate:** a change to today is applied directly. A change to a saved
routine always stops for your approval. This is what stops a bad suggestion — or a
malicious instruction hidden in a screenshot — from silently rewriting your program.

---

## 5. Asking several LLMs at once

```mermaid
flowchart TD
    Q["Your question + your training context"]
    Q --> FAN["Promise.allSettled<br/>all providers start together"]

    FAN --> A["Gemini"]
    FAN --> B["Groq"]
    FAN --> C["OpenRouter"]

    A --> CA["Column 1<br/>streaming"]
    B --> CB["Column 2<br/>streaming"]
    C --> CC["Column 3<br/>failed — shows an error"]

    CA --> PIN["Pin the best answer<br/>saves it to the thread"]
    CB --> PIN
```

`allSettled` rather than `all` is the whole trick: **one provider failing leaves the
others streaming.**

---

## 6. Undo and backup

```mermaid
flowchart LR
    subgraph Fine["Fine-grained — undo one change"]
        CH["Every edit writes to<br/>change_journal<br/>with before + after"]
        CH --> HIST["History screen<br/>'Gemini changed Push A · Undo'"]
        HIST --> REV["Restore before_json<br/>whole LLM turn at once"]
    end

    subgraph Coarse["Coarse — restore a whole day"]
        SNAP["Snapshot after every session<br/>+ daily"]
        SNAP --> KEEP["Keep 7 daily + 4 weekly"]
        KEEP --> DRIVE[["Google Drive folder"]]
        DRIVE --> REST["Restore<br/>(takes a snapshot first)"]
    end
```

---

## 7. Folder structure

Feature-first: everything for one capability lives in one folder, rather than being
scattered by file type. **Every feature folder has a `README.md` in plain English.**

```
fitai/
│
├── README.md                     ← start here
├── PLAN.md                       ← what we're building and why
├── CLAUDE.md                     ← rules for anyone (or any LLM) changing code
│
├── docs/
│   ├── ARCHITECTURE.md           ← this file
│   ├── GLOSSARY.md               ← what "RPE", "plan of record", "scope" mean
│   └── adr/                      ← decisions, numbered, with reasoning
│       ├── 0001-expo-react-native.md
│       ├── 0002-no-backend-until-phase-9.md
│       ├── 0003-repository-pattern.md
│       ├── 0004-react-query-not-uselivequery.md
│       └── 0005-substitution-scope-defaults-to-today.md
│
├── apps/
│   ├── mobile/                   ← THE APP
│   ├── api/                      ← backend (Phase 9, empty until then)
│   └── viewer/                   ← read-only laptop viewer (Phase 11)
│
└── packages/                     ← shared code, used by app and backend
    ├── contract/                 ← the API's shape, defined before the API exists
    ├── core/                     ← database schema + the repository
    ├── tools/                    ← what the LLM is allowed to do
    ├── llm/                      ← providers + context builder
    └── ui/                       ← shared visual components
```

### Inside the app

```
apps/mobile/
│
├── app/                          ← SCREENS. One file = one screen.
│   ├── (tabs)/
│   │   ├── index.tsx             ← Today
│   │   ├── history.tsx           ← Past workouts
│   │   ├── weight.tsx            ← Body weight
│   │   ├── coach.tsx             ← LLM chat
│   │   └── settings.tsx
│   ├── session/[id].tsx          ← A single workout in progress
│   └── _layout.tsx
│
├── src/
│   ├── features/                 ← ONE FOLDER PER CAPABILITY
│   │   │
│   │   ├── workout-logging/
│   │   │   ├── README.md         ← "Logging sets during a workout"
│   │   │   ├── components/
│   │   │   │   ├── SetRow.tsx
│   │   │   │   ├── WeightStepper.tsx
│   │   │   │   ├── RepeatSetButton.tsx
│   │   │   │   └── RestTimerBar.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useSession.ts
│   │   │   │   ├── useLogSet.ts
│   │   │   │   └── useLastPerformance.ts
│   │   │   ├── atoms/
│   │   │   │   └── restTimer.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── body-weight/
│   │   ├── session-planning/     ← repeat / ad hoc / generated
│   │   ├── substitutions/        ← the swap flow
│   │   ├── coach-chat/           ← single and multi-LLM
│   │   ├── history-undo/         ← the change journal UI
│   │   └── backup-restore/
│   │
│   ├── shared/
│   │   ├── components/           ← Button, Sheet, EmptyState, Stepper
│   │   ├── hooks/
│   │   ├── lib/                  ← date, formatting, units
│   │   └── theme/
│   │
│   ├── data/
│   │   ├── queryClient.ts
│   │   ├── queryKeys.ts          ← every cache key in one place
│   │   └── repository.ts         ← wires the app to packages/core
│   │
│   └── providers/                ← app-wide context providers
│
├── assets/
└── app.config.ts
```

### Inside the shared packages

```
packages/
│
├── contract/                     ← Defined in Phase 0, implemented by the
│   ├── operations.ts                backend in Phase 9. Designing this now
│   ├── schemas.ts                   means the API is pre-designed.
│   └── errors.ts
│
├── core/
│   ├── schema/                   ← One table per file
│   │   ├── users.ts
│   │   ├── sessions.ts
│   │   ├── sets.ts
│   │   ├── bodyWeights.ts
│   │   ├── routines.ts
│   │   └── changeJournal.ts
│   ├── repository/
│   │   ├── WorkoutRepository.ts  ← the interface
│   │   └── LocalRepository.ts    ← the SQLite implementation
│   ├── migrations/
│   └── seed/
│       └── exercises.ts          ← the starting exercise library
│
├── tools/                        ← ONE FILE PER LLM TOOL
│   ├── logSet.ts
│   ├── replaceExercise.ts
│   ├── suggestSession.ts
│   ├── suggestSubstitutes.ts
│   ├── getLastPerformance.ts
│   └── registry.ts
│
├── llm/
│   ├── providers/                ← ONE FILE PER PROVIDER
│   │   ├── gemini.ts
│   │   ├── groq.ts
│   │   ├── openrouter.ts
│   │   └── ollama.ts
│   ├── contextBuilder.ts
│   └── registry.ts
│
└── ui/
```

### Why it's shaped this way

| Choice | Reason |
|---|---|
| Feature folders, not `components/` + `hooks/` | Everything for the swap flow is in one place. Deleting a feature means deleting one folder. |
| A `README.md` per feature | You can understand the app by reading folder names and short paragraphs, without opening a `.tsx` file |
| One file per LLM tool, one per provider | Adding either is "create a file, add a line to the registry" — nothing else to find |
| One file per database table | A schema change touches one obvious file |
| `queryKeys.ts` in one place | Cache invalidation bugs come from scattered, mistyped keys |
| `contract/` before there's a backend | The API is designed and exercised for months before it exists |

---

## 8. Where to change things

| I want to… | Go to |
|---|---|
| Change what a screen looks like | `apps/mobile/app/` |
| Change how set logging behaves | `src/features/workout-logging/` |
| Add a database column | `packages/core/schema/`, then generate a migration |
| Add something the LLM can do | `packages/tools/` + register it |
| Add a new LLM provider | `packages/llm/providers/` + register it |
| Change what the LLM knows about you | `packages/llm/contextBuilder.ts` |
| Change how data is read or written | `packages/core/repository/` — **and nowhere else** |
| Understand why something is the way it is | `docs/adr/` |
