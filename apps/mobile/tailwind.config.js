/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // Tuned for one-handed use in a gym: large targets, high contrast.
      minHeight: { tap: '48px' },
      minWidth: { tap: '48px' },
    },
  },
  plugins: [],
};
