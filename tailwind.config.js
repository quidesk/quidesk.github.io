/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--sc-canvas)',
        surface: 'var(--sc-surface)',
        elevated: 'var(--sc-surface-elevated)',
        vellum: 'var(--sc-ink)',
        taupe: 'var(--sc-ink-soft)',
        amber: 'var(--sc-accent)',
        ember: 'var(--sc-accent-warm)',
        gain: 'var(--sc-gain)',
        loss: 'var(--sc-loss)',
        // Backwards compatibility aliases mapped cleanly to Obsidian/Champagne variables
        egyptian: {
          DEFAULT: 'var(--sc-canvas)',
          canvas: 'var(--sc-canvas)',
          dark: '#0B0C0F',
        },
        stone: {
          DEFAULT: 'var(--sc-accent)',
          blue: 'var(--sc-accent)',
          surface: 'var(--accent-subtle)',
          border: 'var(--sc-border-strong)',
          muted: 'var(--sc-ink-muted)',
          light: 'var(--sc-ink-soft)',
        },
        scarlet: {
          DEFAULT: 'var(--sc-accent-warm)',
          accent: 'var(--sc-accent-warm)',
          dim: 'var(--scarlet-dim)',
          glow: 'var(--scarlet-glow)',
        },
      },
      backgroundColor: {
        primary: 'var(--sc-canvas)',
        egyptian: 'var(--sc-canvas)',
        surface: 'var(--sc-surface)',
        'surface-solid': 'var(--sc-surface)',
        card: 'var(--bg-card)',
        'card-hover': 'var(--bg-card-hover)',
        'accent-scarlet': 'var(--sc-accent-warm)',
      },
      borderColor: {
        stone: 'var(--sc-border-strong)',
        'stone-subtle': 'var(--sc-border)',
        'stone-mid': 'var(--border-mid)',
        scarlet: 'var(--sc-accent-warm)',
      },
      textColor: {
        primary: 'var(--sc-ink)',
        secondary: 'var(--sc-ink-soft)',
        dim: 'var(--sc-ink-muted)',
        'on-stone': 'var(--sc-accent-ink)',
        scarlet: 'var(--sc-accent-warm)',
        stone: 'var(--sc-accent)',
      },
      fontFamily: {
        display: ['var(--sc-font-display)', 'system-ui', 'sans-serif'],
        sans: ['var(--sc-font-text)', 'system-ui', 'sans-serif'],
        mono: ['var(--sc-font-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
};
