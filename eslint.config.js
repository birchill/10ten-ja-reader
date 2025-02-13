import eslint from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import vitest from '@vitest/eslint-plugin';
import reactRecommended from 'eslint-plugin-react/configs/recommended.js';
import tailwind from 'eslint-plugin-tailwindcss';
import globals from 'globals';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tseslint from 'typescript-eslint';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default [
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...tailwind.configs['flat/recommended'],
  reactRecommended,
  {
    languageOptions: {
      globals: { ...globals.browser },

      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',

      parserOptions: {
        ecmaFeatures: { jsx: true },
        project: 'tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },

    settings: { react: { version: '16.0', pragma: 'h' } },

    rules: {
      curly: 'error',
      'linebreak-style': ['error', 'unix'],
      'no-constant-condition': ['error', { checkLoops: false }],
      'no-prototype-builtins': 'off',
      'prefer-const': ['error', { destructuring: 'all' }],
      quotes: ['error', 'single', { avoidEscape: true }],
      semi: ['error', 'always'],

      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/no-unknown-property': 'off',

      'tailwindcss/classnames-order': 'off',
      'tailwindcss/no-custom-classname': 'off',

      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': [
        'warn',
        { ignoreIIFE: false },
      ],
      '@typescript-eslint/no-misused-promises': [
        'warn',
        { checksVoidReturn: false },
      ],
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/triple-slash-reference': [
        'error',
        { path: 'always', types: 'never', lib: 'never' },
      ],
    },
  },
  {
    files: ['src/**/*.test.ts'],
    plugins: { vitest },
    rules: {
      ...vitest.configs.recommended.rules,
      'vitest/no-identical-title': ['error'],
    },
  },
  {
    files: [
      '*.{cjs,js,ts}',
      'scripts/**/*.{cjs,js,ts}',
      'tests/**/*.{cjs,js,ts}',
    ],
    languageOptions: { parserOptions: { project: null } },
    rules: {
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
    },
  },
  {
    files: ['*.cjs', 'scripts/**/*.cjs'],
    languageOptions: { globals: { ...globals.node }, sourceType: 'commonjs' },
  },
  {
    files: ['*.{js,ts}', 'scripts/**/*.{js,ts}'],
    languageOptions: { globals: { ...globals.nodeBuiltin } },
  },
];
