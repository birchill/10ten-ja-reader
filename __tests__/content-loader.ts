import { RikaiContent } from '../src/content';

declare global {
  interface Window {
    RikaiContent: any;
  }
}

window.RikaiContent = RikaiContent;
