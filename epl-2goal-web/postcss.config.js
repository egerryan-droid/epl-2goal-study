const path = require('path');

// Explicit `config` path is required on Windows: Next.js's PostCSS runner
// sometimes resolves from a CWD where Tailwind's auto-detection of
// tailwind.config.* fails silently, causing utilities to not compile.
module.exports = {
  plugins: {
    tailwindcss: { config: path.join(__dirname, 'tailwind.config.js') },
    autoprefixer: {},
  },
};
