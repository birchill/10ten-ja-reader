import plugin from 'tailwindcss/plugin';

/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
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
          '@media (prefers-color-scheme: dark)': {
            '.transparent-caret': { 'text-shadow': '0 0 0 white' },
          },
        },
      });
    }),
  ],
};
