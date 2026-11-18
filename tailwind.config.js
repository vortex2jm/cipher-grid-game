/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './client/index.html',
    './client/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Rubik"', '"Space Grotesk"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Space Grotesk"', '"Rubik"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        tactile: '0 4px 0 0 #18181B',
        'tactile-sm': '0 3px 0 0 #18181B',
        'tactile-lg': '0 6px 0 0 #18181B',
      },
    },
  },
  plugins: [],
};
