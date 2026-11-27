import browser from 'webextension-polyfill';

import type { ContentConfigParams } from './content-config-params';

export type TablessEnableReply = { config: ContentConfigParams | null };

export function supportsTablessContent() {
  return browser.runtime.getURL('').startsWith('moz-extension:');
}
