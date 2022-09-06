const colors = require('tailwindcss/colors');

module.exports = {
  purge: ['*.html'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        'ink-black': '#1d1a19',
        gray: colors.stone,
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            color: 'white',
            a: {
              color: '#ddd8d7',
              '&:hover': {
                color: '#2699fa',
              },
            },
            h1: {
              color: 'white',
            },
            h2: {
              color: '#2699fa',
            },
            h3: {
              color: 'white',
            },
            h4: {
              color: 'white',
            },
            strong: {
              color: 'white',
            },
            blockquote: {
              color: 'white',
            },
            code: {
              backgroundColor: theme('colors.gray.700'),
              color: 'white',
              fontWeight: 400,
              paddingLeft: '8px',
              paddingRight: '8px',
              borderRadius: '4px',
            },
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
            'figure > a > *': {
              marginTop: '0',
              marginBottom: '0',
            },
            'figure figcaption': {
              color: '#b9b4b3',
            },
            aside: {
              fontSize: '0.9rem',
              paddingTop: '1rem',
              paddingBottom: '1rem',
            },
            'aside h3': {
              marginTop: '0',
            },
            'aside h4': {
              marginTop: '0',
            },
            'aside *:last-child': {
              marginBottom: '0',
            },
          },
        },
        '2xl': {
          css: {
            aside: {
              fontSize: '1.25rem',
              paddingTop: '1.3em',
              paddingBottom: '1.3em',
            },
            'aside h3': {
              fontSize: '1.33em',
            },
            'aside h4': {
              fontSize: '1.2em',
            },
          },
        },
        lg: {
          css: {
            aside: {
              fontSize: '1.1rem',
              paddingTop: '1.1em',
              paddingBottom: '1.1em',
            },
            'aside h3': {
              fontSize: '1.2em',
            },
          },
        },
        sm: {
          css: {
            aside: {
              fontSize: '0.8rem',
            },
          },
        },
      }),
    },
  },
  variants: {
    extend: {},
  },
  plugins: [require('@tailwindcss/typography')],
};
