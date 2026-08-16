import { Text, View } from 'react-native';
import { Button } from '@/shared/components/Button';
import { useBackupFolder, useBackupNow, useChooseFolder, useSnapshots } from '../hooks/useBackups';

/** How long ago, in words. Precision past "3 days" is not useful here. */
function ago(iso: string): string {
  const mins = Math.floor((Date.now() - Date.parse(iso)) / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)} days ago`;
}

export function BackupCard() {
  const snapshots = useSnapshots();
  const folder = useBackupFolder();
  const chooseFolder = useChooseFolder();
  const backupNow = useBackupNow();

  const latest = snapshots.data?.[0];
  const hasFolder = Boolean(folder.data?.uri);
  const folderBroken = Boolean(folder.data?.uri) && folder.data?.writable === false;

  const staleDays = latest
    ? Math.floor((Date.now() - Date.parse(latest.takenAt)) / 86400000)
    : null;

  return (
    <View className="rounded-3xl border border-neutral-800/70 bg-neutral-900 p-4">
      <Text className="text-base font-semibold text-white">Backup</Text>

      <Text className="mt-1 text-sm text-neutral-500">
        {latest ? `Last backup ${ago(latest.takenAt)}` : 'No backup yet'}
        {snapshots.data && snapshots.data.length > 0
          ? ` · ${snapshots.data.length} kept`
          : ''}
      </Text>

      {/* The phone is the only copy until a folder is chosen — say so plainly. */}
      {!hasFolder ? (
        <View className="mt-3 rounded-xl bg-amber-500/10 p-3">
          <Text className="text-sm text-amber-300">
            Backups are only on this phone. Choose a Google Drive folder so they survive
            losing it.
          </Text>
        </View>
      ) : null}

      {folderBroken ? (
        <View className="mt-3 rounded-xl bg-red-500/10 p-3">
          <Text className="text-sm text-red-300">
            The backup folder is no longer accessible. Choose it again.
          </Text>
        </View>
      ) : null}

      {staleDays !== null && staleDays >= 7 ? (
        <View className="mt-3 rounded-xl bg-amber-500/10 p-3">
          <Text className="text-sm text-amber-300">
            Your last backup is {staleDays} days old.
          </Text>
        </View>
      ) : null}

      <View className="mt-4 gap-2">
        <Button
          label={backupNow.isPending ? 'Backing up…' : 'Back up now'}
          icon="cloud-upload-outline"
          variant="primary"
          block
          disabled={backupNow.isPending}
          onPress={() => backupNow.mutate()}
        />
        <Button
          label={hasFolder ? 'Change backup folder' : 'Choose backup folder'}
          icon="folder-outline"
          onPress={() => chooseFolder.mutate()}
          hint={hasFolder ? undefined : 'Pick a Drive-synced folder'}
        />
      </View>

      {backupNow.data ? (
        <Text className="mt-2 text-sm text-neutral-500">
          {backupNow.data.exported
            ? 'Saved to this phone and your folder.'
            : hasFolder
              ? 'Saved on this phone. Copying to your folder failed — check it still exists.'
              : 'Saved on this phone.'}
        </Text>
      ) : null}

      {backupNow.error ? (
        <Text className="mt-2 text-sm text-red-400">{String(backupNow.error)}</Text>
      ) : null}
    </View>
  );
}
