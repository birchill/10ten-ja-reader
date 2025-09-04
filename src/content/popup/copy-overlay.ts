import type { MajorDataSeries } from '@birchill/jpdict-idb';
import browser from 'webextension-polyfill';

import type { CopyType } from '../../common/copy-keys';
import type { ReferenceAbbreviation } from '../../common/refs';
import { html, svg } from '../../utils/builder';
import { classes } from '../../utils/classes';

import { getTextToCopy } from '../copy-text';
import { getCopyEntryFromResult } from '../get-copy-entry';
import type { QueryResult } from '../query';

import type { CopyState } from './copy-state';
import { renderClipboard } from './icons';
import { getLangTag } from './lang-tag';

export function renderCopyOverlay({
  copyState,
  includeAllSenses,
  includeLessCommonHeadwords,
  includePartOfSpeech,
  kanjiReferences,
  onCancelCopy,
  onCopy,
  result,
  series,
  showKanjiComponents,
}: {
  copyState: CopyState;
  includeAllSenses: boolean;
  includeLessCommonHeadwords: boolean;
  includePartOfSpeech: boolean;
  kanjiReferences: Array<ReferenceAbbreviation>;
  onCancelCopy?: () => void;
  onCopy?: (copyType: CopyType) => void;
  result?: QueryResult;
  series: MajorDataSeries;
  showKanjiComponents?: boolean;
}): HTMLDivElement {
  const copyOverlay = html('div', {
    class: classes(
      'copy-overlay',
      'tp:border-box tp:w-full tp:flex tp:flex-col',
      // It's important to align to the top so that if the popup is very long we
      // don't end up putting the copy buttons off screen somewhere.
      'tp:justify-start tp:items-center',
      'tp:py-7 tp:isolate tp:overflow-hidden',
      // We fade the background so we always want a dark foreground color here,
      // regardless of the theme.
      'tp:text-black',
      'tp:has-overlay:bg-[hsla(0,0%,97%,0.6)]',
      'tp:has-overlay:[transition:background-color_0.3s_ease-in-out]'
    ),
  });

  // Work out what we would copy so we can generate suitable preview text
  const entryToCopy = result
    ? getCopyEntryFromResult({
        result,
        series,
        index: copyState.kind !== 'inactive' ? copyState.index : 0,
      })
    : null;

  // Heading
  const wordToCopy = entryToCopy
    ? getTextToCopy({
        entry: entryToCopy,
        copyType: 'word',
        getMessage: browser.i18n.getMessage.bind(browser.i18n),
      })
    : null;
  const heading = wordToCopy
    ? browser.i18n.getMessage(
        'content_copy_overlay_copy_title_with_word',
        wordToCopy
      )
    : browser.i18n.getMessage('content_copy_overlay_copy_title');
  copyOverlay.append(
    html(
      'div',
      { role: 'heading', class: 'copy-heading', lang: getLangTag() },
      heading
    )
  );

  // Options
  const list = copyOverlay.appendChild(html('ul', { class: 'copy-options' }));

  // Entry button
  {
    const entryPreviewText = entryToCopy
      ? getTextToCopy({
          entry: entryToCopy,
          copyType: 'entry',
          getMessage: browser.i18n.getMessage.bind(browser.i18n),
          includeAllSenses,
          includeLessCommonHeadwords,
          includePartOfSpeech,
          kanjiReferences,
          showKanjiComponents,
        })
      : undefined;
    const button = renderButtonWithPreview({
      label: browser.i18n.getMessage('content_copy_overlay_entry_button'),
      previewText: entryPreviewText,
    });
    button.addEventListener('click', () => onCopy?.('entry'));
    list.append(html('li', {}, button));
  }

  // Tab-separated button
  {
    const tabSeparatedPreviewText = entryToCopy
      ? getTextToCopy({
          entry: entryToCopy,
          copyType: 'tab',
          getMessage: browser.i18n.getMessage.bind(browser.i18n),
          includeAllSenses,
          includeLessCommonHeadwords,
          includePartOfSpeech,
          kanjiReferences,
          showKanjiComponents,
        }).replace(/\t/g, ' → ')
      : undefined;
    const button = renderButtonWithPreview({
      label: browser.i18n.getMessage(
        'content_copy_overlay_tab_separated_button'
      ),
      previewText: tabSeparatedPreviewText,
    });
    button.addEventListener('click', () => onCopy?.('tab'));
    list.append(html('li', {}, button));
  }

  // Word button
  {
    const copyWordButton = list
      .appendChild(html('li'))
      .appendChild(html('button', { class: '-icon-label' }));

    if (wordToCopy) {
      const icon = renderClipboard();
      icon.classList.add('icon');
      copyWordButton.append(icon);
    }
    const copyWordLabel = html('span');
    if (wordToCopy) {
      copyWordLabel.append(wordToCopy);
      copyWordLabel.lang = 'ja';
    } else {
      copyWordLabel.append(
        browser.i18n.getMessage(
          series === 'kanji'
            ? 'content_copy_overlay_kanji_button'
            : 'content_copy_overlay_word_button'
        )
      );
      copyWordLabel.lang = getLangTag();
    }
    copyWordButton.append(copyWordLabel);
    copyWordButton.addEventListener('click', () => onCopy?.('word'));
  }

  // Cancel button
  const cancelButton = html(
    'button',
    { class: 'cancel-button', lang: getLangTag() },
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
  );
  cancelButton.addEventListener('click', () => onCancelCopy?.());
  copyOverlay.append(cancelButton);

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
