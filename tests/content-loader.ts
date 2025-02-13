import { ContentHandler } from '../src/content/content';

import browser from './browser-polyfill';

(window as any).browser = browser;

// Make sure the browser polyfill believes we are in an extension context
(window as any).chrome = { runtime: { id: 'test' } };

declare global {
  interface Window {
    ContentHandler: any;
  }
}

window.ContentHandler = ContentHandler;
