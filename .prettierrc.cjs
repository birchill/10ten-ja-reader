module.exports = {
  // TODO(espeed): Consider reverting bracket spacing to gts default of none.
  bracketSpacing: true,
  singleQuote: true,
  trailingComma: 'es5',
  arrowParens: 'always',
  overrides: [
    {
      files: ['*.js', '*.mjs', '*.ts'],
      options: {
        parser: 'jsdoc-parser',
      },
    },
  ],
};
