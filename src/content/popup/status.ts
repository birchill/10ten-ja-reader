import { MajorDataSeries } from '@birchill/jpdict-idb';
import browser from 'webextension-polyfill';

import {
  CopyKanjiKeyStrings,
  CopyKeys,
  CopyNextKeyStrings,
  CopyType,
} from '../../common/copy-keys';
import { html } from '../../utils/builder';

import { CopyState } from './copy-state';
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

  // In interactive mode, we only use the status bar to show the finished and
  // error states.
  if (copyState.mode !== 'keyboard' && copyState.kind === 'active') {
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
