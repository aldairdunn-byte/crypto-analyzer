/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bybit: {
          bg: '#121318',
          card: '#1A1D26',
          hover: '#262932',
          border: '#262932',
          gold: '#F7A600',
          green: '#0ECB81',
          red: '#F6465D',
          text: '#FFFFFF',
          muted: '#848E9C',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
