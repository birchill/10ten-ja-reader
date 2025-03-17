import plugin from 'tailwindcss/plugin';

/** @type {import('tailwindcss').Config} */
export default {
  plugins: [
    plugin(({ addVariant }) => {
      addVariant(
        'no-overlay',
        '[data-type="window"]:not([data-has-overlay]) &'
      );
    }),
  ],
};
