import { useState } from 'react';
import { Text, View } from 'react-native';
import { Screen } from '@/shared/components/Screen';
import { Button } from '@/shared/components/Button';
import { BackupCard } from '@/features/backup-restore/components/BackupCard';
import { RestoreSheet } from '@/features/backup-restore/components/RestoreSheet';
import { useAutomaticDailySnapshot, useSnapshots } from '@/features/backup-restore/hooks/useBackups';

export default function BackupScreen() {
  const snapshots = useSnapshots();
  const [restoring, setRestoring] = useState(false);

  // Takes a daily snapshot when one is due. Placed here rather than in the root
  // layout so it never delays first paint of the screen you actually opened.
  useAutomaticDailySnapshot();

  return (
    <>
      <Screen title="Backup & Restore" subtitle="Your data lives on this phone">
        <BackupCard />

        <View className="rounded-3xl border border-neutral-800/70 bg-neutral-900 p-4">
          <Text className="text-base font-semibold text-white">Restore</Text>
          <Text className="mt-1 text-sm text-neutral-500">
            Go back to an earlier backup. You'll see what's in it before anything changes.
          </Text>
          <View className="mt-4">
            <Button
              label="Restore from a backup"
              icon="backup-restore"
              block
              disabled={(snapshots.data?.length ?? 0) === 0}
              onPress={() => setRestoring(true)}
            />
          </View>
        </View>

        <View className="rounded-3xl border border-neutral-800/70 bg-neutral-900 p-4">
          <Text className="text-base font-semibold text-white">How backups work</Text>
          <Text className="mt-2 text-sm leading-5 text-neutral-400">
            A backup is taken after every session and once a day. The last 7 days plus
            4 weekly ones are kept — older ones are removed automatically.
            {'\n\n'}
            Everything is on this phone unless you choose a folder. Pick one that Google
            Drive syncs and your training history survives losing the device.
          </Text>
        </View>
      </Screen>

      {restoring ? (
        <RestoreSheet snapshots={snapshots.data ?? []} onClose={() => setRestoring(false)} />
      ) : null}
    </>
  );
}
