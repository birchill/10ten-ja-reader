import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import tsParser from '@typescript-eslint/parser';
import tailwind from 'eslint-plugin-tailwindcss';
import vitest from 'eslint-plugin-vitest';
import globals from 'globals';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default [
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...tailwind.configs['flat/recommended'],
  {
    plugins: { vitest },

    languageOptions: {
      globals: {
        ...globals.browser,
      },

      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',

      parserOptions: {
        project: 'tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },

    rules: {
      curly: 'error',
      'linebreak-style': ['error', 'unix'],

      'no-constant-condition': [
        'error',
        {
          checkLoops: false,
        },
      ],

      'no-prototype-builtins': 'off',

      'prefer-const': [
        'error',
        {
          destructuring: 'all',
        },
      ],

      quotes: [
        'error',
        'single',
        {
          avoidEscape: true,
        },
      ],

      semi: ['error', 'always'],

      'sort-imports': [
        'error',
        {
          ignoreCase: true,
          ignoreDeclarationSort: true,
          ignoreMemberSort: false,
          allowSeparatedGroups: true,
        },
      ],

      'tailwindcss/classnames-order': 'off',
      'tailwindcss/no-custom-classname': 'off',

      ...vitest.configs.recommended.rules,
      'vitest/no-identical-title': ['error'],

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
        {
          path: 'always',
          types: 'never',
          lib: 'never',
        },
      ],
    },
  },
  {
    files: ['**/*.js', '**/*.mjs', 'tests/**/*', 'scripts/**/*'],

    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',

      parserOptions: {
        project: null,
      },
    },

    rules: {
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
    },
  },
];
