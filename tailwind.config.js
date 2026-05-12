/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans:    ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Syne', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'IBM Plex Mono', 'monospace'],
      },
      colors: {
        void:  '#010B18',
        base:  '#050F1E',
        surf:  '#081829',
        elev:  '#0C1F3A',
        over:  '#112D4E',
        cyan:  '#00CAFF',
        profit:'#00E899',
        loss:  '#FF2B60',
        warn:  '#FFA500',
      },
      animation: {
        'spin-slow': 'spin 2s linear infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'tick-up':   'tickUp 0.8s ease forwards',
        'tick-down': 'tickDown 0.8s ease forwards',
        'slide-up':  'slideUp 0.35s ease forwards',
        'fade-in':   'fadeIn 0.25s ease forwards',
      },
      keyframes: {
        tickUp:   { '0%': { color: '#00E899', background: 'rgba(0,232,153,0.12)' }, '100%': { color: 'inherit', background: 'transparent' } },
        tickDown: { '0%': { color: '#FF2B60', background: 'rgba(255,43,96,0.10)' }, '100%': { color: 'inherit', background: 'transparent' } },
        slideUp:  { from: { opacity: '0', transform: 'translateY(14px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        fadeIn:   { from: { opacity: '0' }, to: { opacity: '1' } },
      },
    },
  },
  plugins: [],
}
