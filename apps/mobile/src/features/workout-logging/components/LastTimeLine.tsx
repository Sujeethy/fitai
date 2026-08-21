import { Text } from 'react-native';
import type { Performance } from '@fitai/contract';
import { formatKg } from '@/shared/lib/format';

/**
 * A one-line reminder of what you did last time, so you can see whether today is
 * progress without leaving the screen.
 */
export function LastTimeLine({ performance }: { performance: Performance | null }) {
  if (!performance || performance.sets.length === 0) {
    return <Text className="text-sm text-textFaint">First time doing this — no history yet.</Text>;
  }

  return (
    <Text className="text-sm text-textMuted">
      Last time · <Text className="text-textSecondary">{summarise(performance)}</Text>
    </Text>
  );
}

/** "60 kg × 8, 8, 7" reads faster than three separate lines. */
function summarise(p: Performance): string {
  const weights = new Set(p.sets.map((s) => s.weightKg));
  if (weights.size === 1) {
    const w = p.sets[0]?.weightKg ?? 0;
    return `${formatKg(w)} kg × ${p.sets.map((s) => s.reps).join(', ')}`;
  }
  return p.sets.map((s) => `${formatKg(s.weightKg)}×${s.reps}`).join(', ');
}
