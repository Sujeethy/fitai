/**
 * How numbers are written throughout the app.
 *
 * Weights always show two decimals, including trailing zeros — `60.00`, not `60`.
 * A fixed width means the number doesn't jump sideways as you hold the `+` button,
 * which is the difference between a stepper that feels solid and one that twitches.
 */

export const KG_DECIMALS = 2;

export function formatKg(value: number): string {
  return value.toFixed(KG_DECIMALS);
}

/** With the unit, for display outside an input. */
export function formatWeight(value: number): string {
  return `${formatKg(value)} kg`;
}

/** Reps are whole numbers — decimals there would be nonsense. */
export function formatReps(value: number): string {
  return String(Math.round(value));
}

/**
 * Parse what someone typed into a weight field.
 *
 * Returns null rather than NaN for anything unusable, so callers fall back to the
 * previous value instead of writing garbage. Commas are accepted because some
 * keyboards produce them as the decimal separator.
 */
export function parseNumeric(text: string): number | null {
  const cleaned = text.replace(',', '.').replace(/[^\d.]/g, '');
  if (cleaned === '' || cleaned === '.') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Round to the nearest step, so typing 61 with a 2.5 step doesn't drift the ladder. */
export function roundTo(value: number, decimals = KG_DECIMALS): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}
