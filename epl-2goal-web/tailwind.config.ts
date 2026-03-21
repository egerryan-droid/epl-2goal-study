import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
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

export default config;
