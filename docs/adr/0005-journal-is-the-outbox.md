# 0005 — One table for undo and sync

**Status:** accepted

## Context

Two requirements that look unrelated:

- Undo anything the LLM does that you don't like.
- Phase 9 sync needs a queue of pending local changes.

## Decision

`change_journal` records every mutation with actor, tool, before/after JSON, and a
`batch_id`. Add one column — `synced_at` — and the same table is the sync outbox.

## Consequences

- **Undo:** `before_json` means reverting is a direct restore, not a replay of
  inverse operations. One LLM turn shares a `batch_id`, so "undo that" reverts the
  whole turn atomically instead of one change at a time.
- **Sync:** rows with `synced_at IS NULL` are pending. Phase 9 introduces no new
  queuing mechanism — it reads a table that has been filling correctly since Phase 1.
- The journal grows with every write. At ~125 sets/week this is a few MB a year;
  compaction can wait until it isn't.

## Rejected

- **Separate undo stack and outbox.** Two mechanisms recording the same events,
  free to disagree.
- **In-memory undo.** Lost on app restart, and useless for sync.
