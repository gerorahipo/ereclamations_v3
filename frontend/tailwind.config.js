/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cnps: {
          50:  '#e8f0fb',
          100: '#c5d9f5',
          200: '#9ebded',
          300: '#77a0e4',
          400: '#5a8dde',
          500: '#3d7ad7',
          600: '#2968c8',
          700: '#1b54b1',
          800: '#004a99',  // Bleu CNPS primaire
          900: '#00346f',  // Bleu CNPS foncé (sidebar)
          950: '#001e45',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
