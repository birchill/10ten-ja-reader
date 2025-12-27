import { webdriverio } from '@vitest/browser-webdriverio';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: { label: 'unit', color: 'green' },
          include: [
            './{scripts,src}/**/*.test.{js,mjs,cjs,ts,mts,cts}',
            '.github/actions/**/*.test.{js,mjs,cjs,ts,mts,cts}',
          ],
          exclude: [
            '**/node_modules/**',
            '**/.git/**',
            './src/**/*.browser.test.*',
          ],
          setupFiles: ['fake-indexeddb/auto'],
        },
      },
      {
        test: {
          name: { label: 'browser', color: 'blue' },
          include: ['./src/**/*.browser.test.{js,mjs,cjs,ts,mts,cts}'],
          browser: {
            provider: webdriverio({}),
            enabled: true,
            headless: true,
            instances: [{ browser: 'chrome' }],
          },
        },
      },
    ],
  },
});
