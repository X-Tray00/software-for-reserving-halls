/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'h-dark':        '#1a1a46',
        'h-primary':     '#26265c',
        'h-mid':         '#7178b8',
        'h-accent':      '#a05d97',
        'h-accent-dark': '#6b3f65',
        'h-green':       '#3a9e52',
        'h-text':        '#1a1a2e',
        'h-muted':       '#6b6b8a',
      },
      fontFamily: {
        sans: ['Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        card:       '0 4px 24px rgba(26,26,70,.10)',
        'card-hover':'0 8px 32px rgba(26,26,70,.18)',
        header:     '0 2px 16px rgba(26,26,70,.25)',
        modal:      '0 20px 60px rgba(26,26,70,.25)',
      },
      borderRadius: {
        xl2: '18px',
      },
      keyframes: {
        'pulse-red': {
          '0%, 100%': { outlineColor: '#e53e3e' },
          '50%':      { outlineColor: '#fc8181' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
      },
      animation: {
        'pulse-red': 'pulse-red 1.2s infinite',
        'fade-in':   'fade-in .25s ease',
      },
    },
  },
  plugins: [],
}
