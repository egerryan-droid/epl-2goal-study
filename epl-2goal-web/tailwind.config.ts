import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        win: '#2ecc71',
        draw: '#f39c12',
        loss: '#e74c3c',
        accent: '#3498db',
        surface: {
          dark: '#1a1a2e',
          mid: '#16213e',
          light: '#0f3460',
        },
        text: {
          primary: '#ECF0F1',
          secondary: '#BDC3C7',
          muted: '#7F8C8D',
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
