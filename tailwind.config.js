/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2B5741', // Forest green from uploaded image
          dark: '#1A3F2E',
          light: '#3F7A5A',
          20: 'rgb(43 87 65 / 0.2)' // For ring opacity
        },
        accent: {
          DEFAULT: '#D4A373', // Complementary warm brown
          dark: '#C4946A',
          light: '#E2B589'
        },
        neutral: {
          50: '#F8F9FA',
          100: '#F1F3F4',
          200: '#E8EAED',
          300: '#DADCE0',
          400: '#BDC1C6',
          500: '#9AA0A6',
          600: '#80868B',
          700: '#5F6368',
          800: '#3C4043',
          900: '#202124'
        }
      },
    },
  },
  plugins: [],
};