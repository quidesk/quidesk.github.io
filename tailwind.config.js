/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        egyptian: {
          DEFAULT: '#032035',
          canvas: '#032035',
          dark: '#021827',
        },
        stone: {
          DEFAULT: '#639CC5',
          blue: '#639CC5',
          surface: 'rgba(99, 156, 197, 0.10)',
          border: '#639CC5',
          muted: '#8EADC4',
          light: '#C2DBEC',
        },
        scarlet: {
          DEFAULT: '#EB2F33',
          accent: '#EB2F33',
          dim: 'rgba(235, 47, 51, 0.14)',
          glow: 'rgba(235, 47, 51, 0.35)',
        },
      },
      backgroundColor: {
        primary: '#032035',
        egyptian: '#032035',
        surface: 'rgba(99, 156, 197, 0.10)',
        'surface-solid': '#062842',
        card: 'rgba(99, 156, 197, 0.08)',
        'card-hover': 'rgba(99, 156, 197, 0.16)',
        'accent-scarlet': '#EB2F33',
      },
      borderColor: {
        stone: '#639CC5',
        'stone-subtle': 'rgba(99, 156, 197, 0.22)',
        'stone-mid': 'rgba(99, 156, 197, 0.40)',
        scarlet: '#EB2F33',
      },
      textColor: {
        primary: '#FFFFFF',
        secondary: '#C2DBEC',
        dim: '#8EADC4',
        'on-stone': '#032035',
        scarlet: '#EB2F33',
        stone: '#639CC5',
      },
    },
  },
  plugins: [],
};
