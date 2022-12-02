import browser from 'webextension-polyfill';

// The following code is based __very__ heavily on
// https://github.com/piroor/webextensions-lib-l10n

const getString = (fullKey: string): string =>
  fullKey.replace(/__MSG_([@\w]+)__/g, (matched, key) => {
    return browser.i18n.getMessage(key) || matched;
  });

export function translateDoc() {
  const texts = document.evaluate(
    'descendant::text()[contains(self::text(), "__MSG_")]',
    document,
    null,
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
    null
  );
  for (let i = 0, maxi = texts.snapshotLength; i < maxi; i++) {
    const text = texts.snapshotItem(i);
    if (text) {
      text.nodeValue = getString(text.nodeValue || '');
    }
  }

  const attributes = document.evaluate(
    'descendant::*/attribute::*[contains(., "__MSG_")]',
    document,
    null,
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
    null
  );
  for (let i = 0, maxi = attributes.snapshotLength; i < maxi; i++) {
    const attribute = attributes.snapshotItem(i) as Attr;
    if (attribute) {
      attribute.value = getString(attribute.value);
    }
  }
}

export default translateDoc;
