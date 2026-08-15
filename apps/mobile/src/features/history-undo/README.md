# History and undo

Past sessions, and reversing changes.

**Screens:** `app/(tabs)/history.tsx`
**Tables:** `change_journal`, `sessions`

## Undo works in batches

Every mutation is journalled with the state *before* it, so undo is a direct
restore rather than a replay of inverse operations.

Changes are grouped by `batchId`. A single tap is its own batch; **an entire LLM
turn is one batch**, so "undo that" reverses the whole instruction rather than one
of the four changes it made — which is what you actually mean.

## The same table is the sync outbox

Rows with `synced_at IS NULL` are pending upload. Phase 9's sync engine reads
exactly this table, so it introduces no new queuing mechanism.
See `docs/adr/0005-journal-is-the-outbox.md`.
