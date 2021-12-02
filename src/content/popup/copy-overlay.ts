import { browser } from 'webextension-polyfill-ts';

import {
  KanjiSearchResult,
  NameSearchResult,
  WordSearchResult,
} from '../../background/search-result';
import { ReferenceAbbreviation } from '../../common/refs';
import { getTextToCopy } from '../copy-text';
import { getCopyEntryFromResult } from '../get-copy-entry';
import { CopyState } from '../popup';

import { html, svg } from './builder';
import { renderClipboard } from './icons';
import { getLangTag } from './lang-tag';

export function renderCopyOverlay({
  copyState,
  kanjiReferences,
  result,
  showKanjiComponents,
}: {
  copyState: CopyState;
  kanjiReferences: Array<ReferenceAbbreviation>;
  result?: WordSearchResult | NameSearchResult | KanjiSearchResult;
  showKanjiComponents?: boolean;
}): HTMLDivElement {
  const copyOverlay = html('div', { class: 'copy-overlay' });
  copyOverlay.classList.toggle('-active', copyState.kind !== 'inactive');

  // Heading
  copyOverlay.append(
    html(
      'div',
      {
        role: 'heading',
        class: 'copy-heading',
        lang: getLangTag(),
      },
      browser.i18n.getMessage('content_copy_overlay_copy_title')
    )
  );

  // Work out what we would copy so we can generate suitable preview text
  const entryToCopy = result
    ? getCopyEntryFromResult({
        result,
        index: copyState.kind !== 'inactive' ? copyState.index : 0,
      })
    : null;

  // Options
  const list = copyOverlay.appendChild(html('ul', { class: 'copy-options' }));

  // Entry button
  {
    const entryPreviewText = entryToCopy
      ? getTextToCopy({
          entry: entryToCopy,
          copyType: 'entry',
          kanjiReferences,
          showKanjiComponents,
        })
      : undefined;
    list.append(
      html(
        'li',
        {},
        renderButtonWithPreview({
          label: browser.i18n.getMessage('content_copy_overlay_entry_button'),
          previewText: entryPreviewText,
        })
      )
    );
  }

  // Tab-separated button
  {
    const tabSeparatedPreviewText = entryToCopy
      ? getTextToCopy({
          entry: entryToCopy,
          copyType: 'tab',
          kanjiReferences,
          showKanjiComponents,
        }).replace(/\t/g, ' → ')
      : undefined;
    list.append(
      html(
        'li',
        {},
        renderButtonWithPreview({
          label: browser.i18n.getMessage(
            'content_copy_overlay_tab_separated_button'
          ),
          previewText: tabSeparatedPreviewText,
        })
      )
    );
  }

  // Word button
  {
    const copyWordButton = list
      .appendChild(html('li'))
      .appendChild(html('button', { class: '-icon-label' }));

    if (entryToCopy) {
      const icon = renderClipboard();
      icon.classList.add('icon');
      copyWordButton.append(icon);
    }
    const copyWordLabel = html('span');
    if (entryToCopy) {
      copyWordLabel.append(
        getTextToCopy({
          entry: entryToCopy,
          copyType: 'word',
        })
      );
      copyWordLabel.lang = 'ja';
    } else {
      copyWordLabel.append(
        browser.i18n.getMessage(
          result?.type === 'kanji'
            ? 'content_copy_overlay_kanji_button'
            : 'content_copy_overlay_word_button'
        )
      );
      copyWordLabel.lang = getLangTag();
    }
    copyWordButton.append(copyWordLabel);
  }

  // Cancel button
  copyOverlay.appendChild(
    html(
      'button',
      {
        class: 'cancel-button',
        lang: getLangTag(),
      },
      svg(
        'svg',
        {
          class: 'icon',
          viewBox: '0 0 24 24',
          stroke: 'currentColor',
          'stroke-width': '2',
        },
        svg('path', { d: 'M6 18L18 6M6 6l12 12' })
      ),
      browser.i18n.getMessage('content_copy_overlay_cancel_button')
    )
  );

  return copyOverlay;
}

function renderButtonWithPreview({
  label,
  previewText,
}: {
  label: string;
  previewText?: string;
}) {
  const button = html('button', { lang: getLangTag() }, label);

  if (previewText) {
    const previewRow = html('div', {
      class: 'copy-preview',
      role: 'presentation',
    });

    const icon = renderClipboard();
    icon.classList.add('icon');
    previewRow.append(icon);

    previewRow.append(html('span', { lang: 'ja' }, previewText));

    button.append(previewRow);
  }

  return button;
}
