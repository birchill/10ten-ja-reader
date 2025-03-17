import plugin from 'tailwindcss/plugin';

/** @type {import('tailwindcss').Config} */
export default {
  plugins: [
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
