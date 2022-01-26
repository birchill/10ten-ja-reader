import { MajorDataSeries } from '@birchill/hikibiki-data';
import { browser } from 'webextension-polyfill-ts';

import {
  CopyKanjiKeyStrings,
  CopyKeys,
  CopyNextKeyStrings,
  CopyType,
} from '../../common/copy-keys';
import { CopyState } from '../popup';
import { html } from './builder';
import { renderSpinner } from './icons';

import { getLangTag } from './lang-tag';

export function renderCopyDetails({
  copyNextKey,
  copyState,
  series,
}: {
  copyNextKey: string;
  copyState: CopyState;
  series: MajorDataSeries;
}): HTMLElement | null {
  if (copyState.kind === 'inactive') {
    return null;
  }

  // In touch mode, only use the status bar to show the finished and error
  // states.
  if (copyState.mode === 'overlay' && copyState.kind === 'active') {
    return null;
  }

  const statusDiv = html('div', {
    class: 'status-bar -stack',
    lang: getLangTag(),
  });

  if (copyState.mode === 'keyboard') {
    const keysDiv = html(
      'div',
      { class: 'keys' },
      browser.i18n.getMessage('content_copy_keys_label') + ' '
    );
    statusDiv.append(keysDiv);

    const copyKeys: Array<{ key: string; l10nKey: string }> = CopyKeys.map(
      ({ key, type, popupString }) => {
        if (type === 'word' && series === 'kanji') {
          return { key, l10nKey: CopyKanjiKeyStrings.popupString };
        } else {
          return { key, l10nKey: popupString };
        }
      }
    );
    copyKeys.push({
      key: copyNextKey,
      l10nKey: CopyNextKeyStrings.popupString,
    });

    for (const copyKey of copyKeys) {
      keysDiv.append(
        html('kbd', {}, copyKey.key),
        ' = ' + browser.i18n.getMessage(copyKey.l10nKey)
      );
      if (copyKey.key !== copyNextKey) {
        keysDiv.append(', ');
      }
    }
  }

  if (copyState.kind === 'finished') {
    statusDiv.append(renderCopyStatus(getCopiedString(copyState.type)));
  } else if (copyState.kind === 'error') {
    statusDiv.append(
      renderCopyStatus(browser.i18n.getMessage('content_copy_error'))
    );
  }

  return statusDiv;
}

function getCopiedString(target: CopyType): string {
  switch (target) {
    case 'entry':
      return browser.i18n.getMessage('content_copied_entry');

    case 'tab':
      return browser.i18n.getMessage('content_copied_fields');

    case 'word':
      return browser.i18n.getMessage('content_copied_word');
  }
}

function renderCopyStatus(message: string): HTMLElement {
  return html('div', { class: 'status' }, message);
}

export function renderUpdatingStatus(): HTMLElement {
  const statusDiv = html('div', {
    class: 'status-bar -subdued',
    lang: getLangTag(),
  });

  const statusText = html('div', { class: 'status' });

  const spinner = renderSpinner();
  spinner.classList.add('spinner');
  statusText.append(
    spinner,
    browser.i18n.getMessage('content_database_updating')
  );

  statusDiv.append(statusText);

  return statusDiv;
}

export function renderSwitchDictionaryHint(
  keys: ReadonlyArray<string>
): HTMLElement | null {
  if (keys.length < 1 || keys.length > 3) {
    console.warn(`Unexpected number of keys ${keys.length}`);
    return null;
  }

  const label = browser.i18n.getMessage(
    `content_hint_switch_dict_keys_${keys.length}`
  );

  // Replace all the %KEY% placeholders with <kbd> elements.
  const keysCopy = keys.slice();
  const parts = label
    .split('%')
    .filter(Boolean)
    .map((part) => {
      if (part !== 'KEY') {
        return part;
      }

      return html('kbd', {}, keysCopy.shift() || '-');
    });

  return html(
    'div',
    { class: 'status-bar', lang: getLangTag() },
    html('div', { class: 'status' }, ...parts)
  );
}
