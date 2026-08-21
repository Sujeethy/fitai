import { Text, View } from 'react-native';
import type { RoutineOverview } from '@fitai/contract';
import { computeMuscleVolume } from '@fitai/core';

interface Props {
  routine: RoutineOverview;
}

/**
 * Weekly volume by muscle — one row per muscle, one column per day, zero-filled.
 * A set counts toward its exercise's primary muscle only; secondary involvement
 * shows as a small "+N indirect" note rather than being folded into the same
 * total. See `computeMuscleVolume` for why.
 */
export function MuscleVolumeTable({ routine }: Props) {
  const groups = computeMuscleVolume(routine);
  const dayNumbers = Array.from({ length: routine.cycleLength }, (_, i) => i + 1);

  return (
    <View className="rounded-3xl border border-border/70 bg-surfaceRaised p-4">
      <Text className="text-base font-semibold text-textPrimary">Weekly volume by muscle</Text>
      <Text className="mt-1 text-xs text-textMuted">
        Working sets only — warmups and feelers don't count. "+N indirect" is volume from an
        exercise where this muscle was worked, but wasn't the target.
      </Text>

      <View className="mt-4 flex-row">
        <View className="flex-[3]" />
        <View className="flex-[4] flex-row">
          {dayNumbers.map((n) => (
            <Text key={n} className="flex-1 text-center text-[11px] text-textFaint">
              {n}
            </Text>
          ))}
        </View>
      </View>

      {groups.map((group) => (
        <View key={group.group} className="mt-4">
          <Text className="text-xs uppercase tracking-wide text-textMuted">{group.group}</Text>
          {group.rows.map((row) => (
            <View key={row.key} className="mt-2 flex-row items-center">
              <View className="flex-[3] pr-2">
                <Text className="text-sm text-textSecondary">{row.label}</Text>
                {row.indirectTotal > 0 ? (
                  <Text className="text-[10px] text-textFaint">+{row.indirectTotal} indirect</Text>
                ) : null}
              </View>
              <View className="flex-[4] flex-row">
                {row.byDay.map((count, i) => (
                  <Text
                    key={i}
                    className={
                      count > 0
                        ? 'flex-1 text-center text-sm font-medium text-textPrimary'
                        : 'flex-1 text-center text-sm text-textFaintest'
                    }
                  >
                    {count}
                  </Text>
                ))}
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
