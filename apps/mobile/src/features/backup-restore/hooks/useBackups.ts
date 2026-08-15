import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { isDailySnapshotDue, nowIso, type SnapshotRef } from '@fitai/core';
import { createSnapshotAndPrune, deleteSnapshot, listSnapshots } from '../lib/snapshots';
import {
  exportSnapshotToFolder,
  folderStillWritable,
  pickBackupFolder,
} from '../lib/exportToFolder';

/**
 * The chosen backup folder's URI.
 *
 * SecureStore rather than the database, for one specific reason: the folder must
 * still be reachable when the database is the thing that needs restoring. Storing
 * it inside the file you are trying to recover would be circular.
 */
const FOLDER_KEY = 'fitai.backupFolderUri';

const KEYS = {
  snapshots: ['backups', 'snapshots'] as const,
  folder: ['backups', 'folder'] as const,
};

export function useSnapshots() {
  return useQuery({
    queryKey: KEYS.snapshots,
    queryFn: async (): Promise<SnapshotRef[]> => listSnapshots(),
  });
}

export function useBackupFolder() {
  return useQuery({
    queryKey: KEYS.folder,
    queryFn: async () => {
      const uri = await SecureStore.getItemAsync(FOLDER_KEY);
      if (!uri) return { uri: null, writable: false };
      return { uri, writable: await folderStillWritable(uri) };
    },
  });
}

export function useChooseFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const uri = await pickBackupFolder();
      if (uri) await SecureStore.setItemAsync(FOLDER_KEY, uri);
      return uri;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEYS.folder }),
  });
}

/**
 * Take a snapshot, prune to policy, and copy it out to the chosen folder.
 *
 * The export is best-effort: if the folder is gone or unwritable, the local
 * snapshot still succeeded, and failing the whole operation would leave you with
 * no backup rather than a partial one.
 */
export function useBackupNow() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ snapshot: SnapshotRef; exported: boolean }> => {
      const snapshot = await createSnapshotAndPrune();

      const folderUri = await SecureStore.getItemAsync(FOLDER_KEY);
      if (!folderUri) return { snapshot, exported: false };

      try {
        await exportSnapshotToFolder(folderUri, snapshot.name);
        return { snapshot, exported: true };
      } catch {
        return { snapshot, exported: false };
      }
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEYS.snapshots }),
  });
}

export function useDeleteSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => deleteSnapshot(name),
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEYS.snapshots }),
  });
}

/**
 * Take a daily snapshot on app open when one is due.
 *
 * Not a scheduled background job: Android's background limits make those
 * unreliable, and "whenever the app is opened" is frequent enough for something
 * you use most days.
 */
export function useAutomaticDailySnapshot() {
  const [checked, setChecked] = useState(false);
  const backup = useBackupNow();

  const run = useCallback(async () => {
    const snapshots = listSnapshots();
    const last = snapshots[0]?.takenAt ?? null;
    if (isDailySnapshotDue(last, nowIso())) {
      await backup.mutateAsync();
    }
  }, [backup]);

  useEffect(() => {
    if (checked) return;
    setChecked(true);
    void run().catch(() => {
      // A failed automatic backup must never block the app. The Settings screen
      // shows how stale the last snapshot is, which is where this surfaces.
    });
  }, [checked, run]);
}
