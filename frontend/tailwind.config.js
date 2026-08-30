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
        accent: {
          50:  '#fef3e8',
          100: '#fce1c4',
          200: '#f9c98f',
          300: '#f7b565',
          400: '#f5a04d',
          500: '#f2871f',  // Orange du logo CNPS
          600: '#db7615',
          700: '#b25f11',
          800: '#8a480d',
          900: '#5c3009',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
