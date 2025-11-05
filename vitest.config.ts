import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      './{scripts,src}/**/*.test.{js,mjs,cjs,ts,mts,cts}',
      '.github/actions/**/*.test.{js,mjs,cjs,ts,mts,cts}',
    ],
    setupFiles: ['fake-indexeddb/auto'],
  },
});
