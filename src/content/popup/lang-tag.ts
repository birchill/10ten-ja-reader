import browser from 'webextension-polyfill';

// Cache language tag since we fetch it a lot
let langTag: string | null = null;
export function getLangTag() {
  if (langTag === null) {
    langTag = browser.i18n.getMessage('lang_tag');
  }
  return langTag;
}
