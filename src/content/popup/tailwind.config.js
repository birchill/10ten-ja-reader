/** @type {import('tailwindcss').Config} */
export default {
  prefix: 'tp-',
  corePlugins: { preflight: false },
  content: ['./src/content/popup/**/*.{ts,tsx}'],
  theme: {
    extend: {
      borderRadius: {
        sm: 'calc(0.125 * var(--base-font-size))',
        DEFAULT: 'calc(0.25 * var(--base-font-size))',
        md: 'calc(0.375 * var(--base-font-size))',
        lg: 'calc(0.5 * var(--base-font-size))',
        xl: 'calc(0.75 * var(--base-font-size))',
        '2xl': 'calc(1.25 * var(--base-font-size))',
        '3xl': 'calc(1.5 * var(--base-font-size))',
      },
      fontSize: {
        sm: [
          'calc(12 / 14 * var(--base-font-size))',
          { lineHeight: 'calc(1.25 * var(--base-font-size))' },
        ],
      },
      spacing: {
        0.5: 'calc(0.125 * var(--base-font-size))',
        1: 'calc(0.25 * var(--base-font-size))',
        1.5: 'calc(0.375 * var(--base-font-size))',
        2: 'calc(0.5 * var(--base-font-size))',
        2.5: 'calc(0.625 * var(--base-font-size))',
        3: 'calc(0.75 * var(--base-font-size))',
        3.5: 'calc(0.875 * var(--base-font-size))',
        4: 'calc(1 * var(--base-font-size))',
        5: 'calc(1.25 * var(--base-font-size))',
        6: 'calc(1.5 * var(--base-font-size))',
        7: 'calc(1.75 * var(--base-font-size))',
        8: 'calc(2 * var(--base-font-size))',
        9: 'calc(2.25 * var(--base-font-size))',
        10: 'calc(2.5 * var(--base-font-size))',
        11: 'calc(2.75 * var(--base-font-size))',
        12: 'calc(3 * var(--base-font-size))',
        14: 'calc(3.5 * var(--base-font-size))',
        16: 'calc(4 * var(--base-font-size))',
        20: 'calc(5 * var(--base-font-size))',
        24: 'calc(6 * var(--base-font-size))',
        28: 'calc(7 * var(--base-font-size))',
        32: 'calc(8 * var(--base-font-size))',
        36: 'calc(9 * var(--base-font-size))',
        40: 'calc(10 * var(--base-font-size))',
        44: 'calc(11 * var(--base-font-size))',
        48: 'calc(12 * var(--base-font-size))',
        52: 'calc(13 * var(--base-font-size))',
        56: 'calc(14 * var(--base-font-size))',
        60: 'calc(15 * var(--base-font-size))',
        64: 'calc(16 * var(--base-font-size))',
        72: 'calc(18 * var(--base-font-size))',
        80: 'calc(20 * var(--base-font-size))',
        96: 'calc(24 * var(--base-font-size))',
      },
    },
  },
};