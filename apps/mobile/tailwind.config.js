/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // Tuned for one-handed use in a gym: large targets, high contrast.
      minHeight: { tap: '48px' },
      minWidth: { tap: '48px' },
      // Semantic color tokens — must match src/shared/theme/colors.ts exactly.
      // Node loads this file directly (not through Metro/Babel), so it can't
      // import the TS module; the two are kept in sync by hand. See
      // src/shared/theme/README.md.
      colors: {
        surface: '#0a0a0a',
        surfaceRaised: '#171717',
        surfaceOverlay: '#262626',
        surfaceOverlayStrong: '#404040',

        border: '#262626',
        borderMuted: '#171717',
        borderStrong: '#404040',

        accent: '#10b981',
        accentMuted: '#34d399',
        accentStrong: '#059669',
        success: '#10b981',
        warning: '#f59e0b',
        warningMuted: '#fcd34d',
        danger: '#f87171',
        dangerMuted: '#fca5a5',
        dangerStrong: '#ef4444',

        textPrimary: '#ffffff',
        textSecondary: '#d4d4d4',
        textDim: '#a3a3a3',
        textMuted: '#737373',
        textFaint: '#525252',
        textFaintest: '#404040',
        textInverse: '#0a0a0a',
      },
    },
  },
  plugins: [],
};
