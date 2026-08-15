import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Updates from 'expo-updates';
import { DevSettings } from 'react-native';
import type { SnapshotRef } from '@fitai/core';
import { Button } from '@/shared/components/Button';
import { restoreSnapshot, summariseSnapshot, type SnapshotSummary } from '../lib/restore';

interface Props {
  snapshots: readonly SnapshotRef[];
  onClose: () => void;
}

/**
 * Restoring, in two deliberate steps: choose, then confirm against a summary.
 *
 * The summary matters because a backup file is opaque — a date tells you nothing
 * about whether the session you want is in it. Showing session and set counts
 * turns "I think this is the right one" into knowing.
 */
export function RestoreSheet({ snapshots, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<SnapshotRef | null>(null);
  const [summary, setSummary] = useState<SnapshotSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  const choose = (s: SnapshotRef) => {
    try {
      setSummary(summariseSnapshot(s.name));
      setSelected(s);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read that backup.');
    }
  };

  const confirm = async () => {
    if (!selected) return;
    setRestoring(true);
    try {
      await restoreSnapshot(selected.name);
      // The open connection still points at the replaced file's pages, so the app
      // must restart rather than carry on with stale state.
      if (__DEV__) DevSettings.reload();
      else await Updates.reloadAsync();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Restore failed.');
      setRestoring(false);
    }
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/60" onPress={onClose} />
      <View
        className="max-h-[80%] rounded-t-3xl bg-neutral-900 px-5 pt-5"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <Text className="text-xl font-semibold text-white">
          {selected ? 'Restore this backup?' : 'Restore a backup'}
        </Text>

        {!selected ? (
          <>
            <Text className="mt-1 text-sm text-neutral-500">
              Pick one to see what it contains.
            </Text>
            <ScrollView className="mt-4">
              <View className="gap-1">
                {snapshots.map((s) => (
                  <Pressable
                    key={s.name}
                    onPress={() => choose(s)}
                    className="min-h-[56px] flex-row items-center justify-between rounded-xl bg-neutral-800 px-4 py-3 active:bg-neutral-700"
                  >
                    <Text className="text-white">
                      {s.takenAt.slice(0, 16).replace('T', ' ')}
                    </Text>
                    <Text className="text-xs text-neutral-500">
                      {(s.sizeBytes / 1024).toFixed(0)} KB
                    </Text>
                  </Pressable>
                ))}
                {snapshots.length === 0 ? (
                  <Text className="py-6 text-center text-neutral-500">No backups yet.</Text>
                ) : null}
              </View>
            </ScrollView>
          </>
        ) : (
          <View className="mt-4 gap-3">
            <View className="rounded-xl bg-neutral-800 p-4">
              <Text className="text-sm text-neutral-400">
                {selected.takenAt.slice(0, 16).replace('T', ' ')}
              </Text>
              <View className="mt-3 gap-1.5">
                <Row label="Sessions" value={String(summary?.sessions ?? 0)} />
                <Row label="Sets" value={String(summary?.sets ?? 0)} />
                <Row label="Body weight entries" value={String(summary?.bodyWeights ?? 0)} />
                <Row label="Last session" value={summary?.lastSessionDate ?? 'none'} />
              </View>
            </View>

            <View className="rounded-xl bg-amber-500/10 p-3">
              <Text className="text-sm text-amber-300">
                Everything logged after this point is replaced. A backup of your current
                data is taken first, so this can be undone.
              </Text>
            </View>

            <Button
              label={restoring ? 'Restoring…' : 'Restore and restart'}
              variant="primary"
              block
              disabled={restoring}
              onPress={confirm}
            />
            <Button
              label="Pick a different one"
              variant="ghost"
              onPress={() => {
                setSelected(null);
                setSummary(null);
              }}
            />
          </View>
        )}

        {error ? <Text className="mt-2 text-sm text-red-400">{error}</Text> : null}

        {!selected ? (
          <View className="mt-3">
            <Button label="Cancel" variant="ghost" block onPress={onClose} />
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-neutral-400">{label}</Text>
      <Text className="font-medium text-white">{value}</Text>
    </View>
  );
}
