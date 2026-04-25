const path = require('path');

// Content glob uses an absolute path because relative globs can fail to match
// on Windows when Tailwind is invoked via Next.js's PostCSS runner — the CWD
// at scan time doesn't always align with this config's directory.
const CONTENT = [
  path.join(__dirname, 'src/**/*.{js,ts,jsx,tsx,mdx}').replace(/\\/g, '/'),
];

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: CONTENT,
  theme: {
    extend: {
      colors: {
        win: 'var(--color-win)',
        draw: 'var(--color-draw)',
        loss: 'var(--color-loss)',
        accent: 'var(--color-accent)',
        surface: {
          dark: 'var(--color-surface-dark)',
          mid: 'var(--color-surface-mid)',
          light: 'var(--color-surface-light)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
        },
      },
      fontFamily: {
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
