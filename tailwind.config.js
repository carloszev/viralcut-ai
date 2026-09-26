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
        dark: {
          950: '#07080B',
          900: '#0C0D14',
          850: '#11131C',
          800: '#161925',
          700: '#202434',
          600: '#2F354D',
        },
        cyber: {
          cyan: '#00F0FF',
          blue: '#0070F3',
          purple: '#7928CA',
          magenta: '#FF0080',
          green: '#00DF8F',
          yellow: '#FFDF00',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 25px -5px rgba(0, 240, 255, 0.35)',
        'glow-purple': '0 0 25px -5px rgba(121, 40, 202, 0.35)',
        'glow-green': '0 0 25px -5px rgba(0, 223, 143, 0.35)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        }
      }
    },
  },
  plugins: [],
}
