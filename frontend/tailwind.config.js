/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#0E1015',
        surface: '#161922',
        surface2: '#1D2029',
        border: '#272B36',
        muted: '#8B93A7',
        ink: '#E7E9EE',
        accent: '#6C6CF5',
        accent2: '#F5A623',
        good: '#3DDC97',
        bad: '#F0556B',
        neutral2: '#94A0B8',
      },
      fontFamily: {
        display: ['var(--font-grotesk)', 'sans-serif'],
        body: ['var(--font-inter)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
};
