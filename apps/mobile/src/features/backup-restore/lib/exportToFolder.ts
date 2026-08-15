import * as Legacy from 'expo-file-system/legacy';
import { snapshotFile } from './snapshots';

/**
 * Copying a snapshot out to a folder you choose — point it at a Google
 * Drive-synced one and off-device backup becomes automatic and free.
 *
 * This uses `expo-file-system/legacy`, deliberately. Storage Access Framework has
 * no equivalent in the new `File`/`Directory` API as of SDK 57, so the legacy
 * surface is the only way to write outside the app sandbox. Everything else in the
 * feature uses the modern API.
 */

const SAF = Legacy.StorageAccessFramework;

/**
 * Ask for a folder once. Android persists the grant, so later writes need no
 * further prompting.
 *
 * Returns the folder's content:// URI, or null if you cancelled.
 */
export async function pickBackupFolder(): Promise<string | null> {
  const result = await SAF.requestDirectoryPermissionsAsync();
  return result.granted ? result.directoryUri : null;
}

/**
 * Write a snapshot into the chosen folder.
 *
 * Base64 round-trip rather than a stream: SAF writes go through
 * `writeAsStringAsync`, which takes a string. The database is a few MB even after
 * years of logging, so holding it in memory briefly is not a concern.
 */
export async function exportSnapshotToFolder(
  folderUri: string,
  snapshotName: string,
): Promise<string> {
  const source = snapshotFile(snapshotName);
  if (!source.exists) {
    throw new Error(`Snapshot ${snapshotName} no longer exists.`);
  }

  const base64 = await source.base64();
  const targetUri = await SAF.createFileAsync(
    folderUri,
    snapshotName.replace(/\.db$/, ''),
    'application/octet-stream',
  );

  await Legacy.writeAsStringAsync(targetUri, base64, {
    encoding: Legacy.EncodingType.Base64,
  });

  return targetUri;
}

/**
 * Confirm the folder grant still stands.
 *
 * Android can revoke it — the user clears app data, or removes the permission in
 * settings — and a backup that silently stopped working is worse than no backup,
 * so this is checked rather than assumed.
 */
export async function folderStillWritable(folderUri: string): Promise<boolean> {
  try {
    await SAF.readDirectoryAsync(folderUri);
    return true;
  } catch {
    return false;
  }
}

/** Import a `.db` a file picker returned, into the local snapshot folder. */
export async function copyIntoSnapshots(sourceUri: string, name: string): Promise<void> {
  const base64 = await Legacy.readAsStringAsync(sourceUri, {
    encoding: Legacy.EncodingType.Base64,
  });

  const target = snapshotFile(name);
  if (target.exists) target.delete();
  target.create();
  target.write(base64, { encoding: 'base64' });

}
