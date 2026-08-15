/**
 * IDs are generated on the client, never by the database.
 *
 * Autoincrement would mean a row cannot exist until something assigns it a number —
 * which breaks offline creates, and makes sync ambiguous. See CLAUDE.md invariant 6.
 *
 * React Native provides `crypto.randomUUID` via expo-crypto's polyfill; the fallback
 * covers plain Node in tests.
 */
interface CryptoLike {
  randomUUID?: () => string;
  getRandomValues?: <T extends Uint8Array>(array: T) => T;
}

export function randomUUID(): string {
  const c = (globalThis as { crypto?: CryptoLike }).crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();

  // RFC 4122 v4 fallback.
  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === 'function') {
    c.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = ((bytes[6] as number) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] as number) & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** ISO-8601 instant, the format every timestamp column uses. */
export const nowIso = (): string => new Date().toISOString();

/** Today as YYYY-MM-DD in the device's local timezone, not UTC. */
export function todayIso(): string {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}
