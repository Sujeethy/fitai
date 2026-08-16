/**
 * The single source of truth for color. Named by role (`surface`, `accent`,
 * `textMuted`), not by shade (`neutral-900`) — so retuning the palette is an
 * edit here, not a find-and-replace across every screen. See docs/NEXT.md §2.
 *
 * `tailwind.config.js` re-exports the same values as utility classes
 * (`bg-surface`, `text-textMuted`, …) for use in `className`. This file is
 * for the few places a color has to be a JS value instead — `color` props on
 * icons, `placeholderTextColor`, Reanimated-driven styles.
 */
export const colors = {
  surface: '#0a0a0a',
  surfaceRaised: '#171717',
  surfaceOverlay: '#262626',

  border: '#262626',
  borderMuted: '#171717',
  borderStrong: '#404040',

  accent: '#10b981',
  accentMuted: '#34d399',
  success: '#10b981',
  warning: '#f59e0b',
  warningMuted: '#fcd34d',
  danger: '#f87171',
  dangerStrong: '#ef4444',

  textPrimary: '#ffffff',
  textSecondary: '#d4d4d4',
  textMuted: '#737373',
  textFaint: '#525252',
  textInverse: '#0a0a0a',
} as const;

export type ColorToken = keyof typeof colors;
