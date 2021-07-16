module.exports = {
  ...require('gts/.prettierrc.json'),
  // TODO(espeed): Consider reverting bracket spacing to gts default of none.
  bracketSpacing: true,
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
