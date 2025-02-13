import colors from 'tailwindcss/colors';
import plugin from 'tailwindcss/plugin';

/** @type {import('tailwindcss').Config} */
export default {
  corePlugins: { preflight: false },
  content: ['./src/options/**/*.{html,ts,tsx}'],
  theme: {
    extend: {
      backgroundImage: { 'warning-red': "url('/images/warning-red.svg')" },
      colors: {
        black: '#1d1a19',
        blue: {
          50: '#e3f4fe',
          100: '#bcdffe',
          200: '#97c9ec',
          300: '#65b7fc',
          400: '#44a7fc',
          500: '#2698fb',
          600: '#2589ed',
          700: '#2277d9',
          800: '#1f66c7',
          900: '#1a47a8',
        },
        yellow: {
          DEFAULT: '#ffd500',
          50: '#fffde0',
          100: '#fffbcc',
          200: '#fff7a3',
          300: '#fff07a',
          400: '#ffe952',
          500: '#ffe029',
          600: '#ffd500',
          700: '#c7a200',
          800: '#8f7000',
          900: '#574200',
        },
        red: {
          50: '#ffebef',
          100: '#ffccd5',
          200: '#f0989f',
          300: '#e66f79',
          400: '#f24b59',
          500: '#f83540',
          600: '#e92a3f',
          700: '#d71f38',
          800: '#ca1631',
          900: '#b71e34',
        },
        green: {
          50: '#e8f5e9',
          100: '#c8e6c9',
          200: '#a5d6a7',
          300: '#ffef67',
          400: '#66b36a',
          500: '#1db954',
          600: '#4caf50',
          700: '#43a047',
          800: '#2e7d32',
          900: '#1b5e20',
        },
        purple: colors.violet,
      },
      gridTemplateColumns: { keys: 'minmax(12em, auto) 1fr' },
      fontFamily: { inherit: 'inherit' },
    },
    screens: {
      // This breakpoint corresponds to a point between the width of a mobile
      // device the width of the Firefox settings screen.
      //
      // The default value of 640px is wider than the Firefox settings screen.
      sm: '500px',
    },
  },
  plugins: [
    plugin(({ addVariant }) => {
      addVariant('firefox', ':root.firefox &');
    }),
    plugin(({ addUtilities }) => {
      addUtilities({
        '.outline-auto': { 'outline-style': 'auto' },
        '.transparent-caret': {
          color: 'transparent',
          'text-shadow': '0 0 0 black',
        },
        '@media (prefers-color-scheme: dark)': {
          '.transparent-caret': { 'text-shadow': '0 0 0 white' },
        },
      });
    }),
  ],
};
