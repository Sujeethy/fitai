# Features

One folder per capability. Everything for a feature — its components, hooks, and UI
state — lives together, so understanding it means reading one directory, and
removing it means deleting one directory.

Empty until Phase 1. See `.claude/skills/add-feature/SKILL.md` for the conventions,
and [docs/ARCHITECTURE.md](../../../../docs/ARCHITECTURE.md#7-folder-structure) for
where this sits.

Planned:

| Folder | Phase | What it does |
|---|---|---|
| `workout-logging/` | 1 | Logging sets during a session — the core loop |
| `body-weight/` | 1 | Recording and viewing body weight |
| `backup-restore/` | 1 | Snapshots and the Drive-folder export |
| `session-planning/` | 3 | Repeat, ad hoc, saved routine, or LLM-generated |
| `substitutions/` | 4 | The swap flow, and its history |
| `coach-chat/` | 6 | Single and multi-LLM chat |
| `history-undo/` | 6 | The change journal, and reverting an LLM turn |
