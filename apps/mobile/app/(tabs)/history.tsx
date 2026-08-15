import { Text, View } from 'react-native';
import type { JournalEntry } from '@fitai/contract';
import { Screen } from '@/shared/components/Screen';
import { Button } from '@/shared/components/Button';
import { EmptyState } from '@/shared/components/EmptyState';
import { useJournal, useUndoBatch } from '@/data/useRepository';

/**
 * Every change, newest first, with who made it — and one tap to reverse it.
 *
 * Entries are grouped by `batchId` rather than listed individually: a single LLM
 * instruction can produce four changes, and "undo that" should reverse the
 * instruction, not one quarter of it.
 */
export default function HistoryScreen() {
  const journal = useJournal();
  const undo = useUndoBatch();

  const batches = groupByBatch(journal.data?.items ?? []);

  return (
    <Screen title="History" subtitle="Every change, and how to undo it">
      {journal.isPending ? <Text className="text-neutral-500">Loading…</Text> : null}

      {batches.length === 0 && !journal.isPending ? (
        <EmptyState title="Nothing logged yet" hint="Changes you make will show up here." />
      ) : null}

      {batches.map((b) => (
        <View key={b.batchId} className="rounded-2xl bg-neutral-900 p-4">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text className="text-white">{describeBatch(b)}</Text>
              <Text className="mt-0.5 text-xs text-neutral-500">
                {b.actor === 'llm' ? `${b.provider ?? 'assistant'} · ` : ''}
                {b.at.slice(0, 16).replace('T', ' ')}
              </Text>
            </View>
            <Button
              label="Undo"
              variant="danger"
              disabled={undo.isPending}
              onPress={() => undo.mutate(b.batchId)}
            />
          </View>
        </View>
      ))}

      {undo.error ? <Text className="text-sm text-red-400">{undo.error.message}</Text> : null}
    </Screen>
  );
}

interface Batch {
  batchId: string;
  actor: 'user' | 'llm';
  provider: string | null;
  tool: string | null;
  at: string;
  entries: JournalEntry[];
}

function groupByBatch(entries: readonly JournalEntry[]): Batch[] {
  const map = new Map<string, Batch>();

  for (const e of entries) {
    const existing = map.get(e.batchId);
    if (existing) {
      existing.entries.push(e);
      continue;
    }
    map.set(e.batchId, {
      batchId: e.batchId,
      actor: e.actor,
      provider: e.provider,
      tool: e.tool,
      at: e.createdAt,
      entries: [e],
    });
  }

  return [...map.values()].sort((a, b) => b.at.localeCompare(a.at));
}

const LABELS: Record<string, string> = {
  sets: 'set',
  sessions: 'session',
  session_exercises: 'exercise',
  body_weights: 'body weight',
  exercise_substitutes: 'substitution',
  change_journal: 'undo',
};

function describeBatch(b: Batch): string {
  if (b.entries.some((e) => e.entityTable === 'change_journal')) return 'Undid an earlier change';

  const main = b.entries[0];
  if (!main) return 'Change';

  const noun = LABELS[main.entityTable] ?? main.entityTable;
  const verb =
    main.operation === 'insert' ? 'Added' : main.operation === 'delete' ? 'Removed' : 'Edited';

  const extra = b.entries.length > 1 ? ` (+${b.entries.length - 1} more)` : '';
  return `${verb} ${noun}${extra}`;
}
