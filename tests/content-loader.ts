import { browser } from './browser-polyfill';
(window as any).browser = browser;

import { RikaiContent } from '../src/content';

declare global {
  interface Window {
    RikaiContent: any;
  }
}

window.RikaiContent = RikaiContent;
