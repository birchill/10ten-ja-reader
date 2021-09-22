import { browser } from './browser-polyfill';
(window as any).browser = browser;

import { ContentHandler } from '../src/content/content';

declare global {
  interface Window {
    ContentHandler: any;
  }
}

window.ContentHandler = ContentHandler;
