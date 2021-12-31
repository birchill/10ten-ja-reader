/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'subject-case': [2, 'always', 'sentence-case'],
    // Max line lengths is an antipattern.
    'body-max-line-length': [0],
    'header-max-length': [0],
    // Consistently require no period at the end of summary.
    'header-full-stop': [2, 'never', '.'],
  },
};
