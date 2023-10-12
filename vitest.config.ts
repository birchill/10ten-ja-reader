import GithubActionsReporter from 'vitest-github-actions-reporter';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      './{scripts,src}/**/*.test.{js,mjs,cjs,ts,mts,cts}',
      '.github/actions/**/*.test.{js,mjs,cjs,ts,mts,cts}',
    ],
    reporters: process.env.GITHUB_ACTIONS
      ? ['default', new GithubActionsReporter()]
      : 'default',
    setupFiles: ['fake-indexeddb/auto'],
  },
});
