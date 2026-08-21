import { Text, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
      {journal.isPending ? <Text className="text-textMuted">Loading…</Text> : null}

      {batches.length === 0 && !journal.isPending ? (
        <EmptyState title="Nothing logged yet" hint="Changes you make will show up here." />
      ) : null}

      {batches.map((b) => (
        <Animated.View
          key={b.batchId}
          entering={FadeInDown.springify().damping(18)}
          layout={LinearTransition.springify().damping(20)}
          className="rounded-3xl border border-border/70 bg-surfaceRaised p-4"
        >
          <View className="flex-row items-start justify-between gap-3">
            <View className="mt-0.5">
              <MaterialCommunityIcons
                name={b.actor === 'llm' ? 'robot-outline' : 'gesture-tap'}
                size={18}
                color={b.actor === 'llm' ? '#a78bfa' : '#6b6b70'}
              />
            </View>
            <View className="flex-1">
              <Text className="text-textPrimary">{describeBatch(b)}</Text>
              <Text className="mt-0.5 text-xs text-textMuted">
                {b.actor === 'llm' ? `${b.provider ?? 'assistant'} · ` : ''}
                {b.at.slice(0, 16).replace('T', ' ')}
              </Text>
            </View>
            <Button
              label="Undo"
              variant="danger"
              disabled={undo.isPending}
              icon="undo-variant"
              onPress={() => undo.mutate(b.batchId)}
            />
          </View>
        </Animated.View>
      ))}

      {undo.error ? <Text className="text-sm text-danger">{undo.error.message}</Text> : null}
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
