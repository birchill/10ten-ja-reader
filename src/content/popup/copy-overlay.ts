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
import { HTML_NS, SVG_NS } from '../svg';
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
  const copyOverlay = document.createElementNS(
    HTML_NS,
    'div'
  ) as HTMLDivElement;
  copyOverlay.classList.add('copy-overlay');
  copyOverlay.classList.toggle('-active', copyState.kind !== 'inactive');

  // Heading
  const copyHeading = copyOverlay.appendChild(
    document.createElementNS(HTML_NS, 'div')
  );
  copyHeading.classList.add('copy-heading');
  copyHeading.setAttribute('role', 'heading');
  copyHeading.append(
    browser.i18n.getMessage('content_copy_overlay_copy_title')
  );
  copyHeading.lang = getLangTag();

  // Work out what we would copy so we can generate suitable preview text
  const entryToCopy = result
    ? getCopyEntryFromResult({
        result,
        index: copyState.kind !== 'inactive' ? copyState.index : 0,
      })
    : null;

  // Options
  const list = copyOverlay.appendChild(document.createElementNS(HTML_NS, 'ul'));
  list.classList.add('copy-options');

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

    list.appendChild(document.createElementNS(HTML_NS, 'li')).appendChild(
      renderButtonWithPreview({
        label: browser.i18n.getMessage('content_copy_overlay_entry_button'),
        previewText: entryPreviewText,
      })
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

    list.appendChild(document.createElementNS(HTML_NS, 'li')).appendChild(
      renderButtonWithPreview({
        label: browser.i18n.getMessage(
          'content_copy_overlay_tab_separated_button'
        ),
        previewText: tabSeparatedPreviewText,
      })
    );
  }

  // Word button
  {
    const copyWordButton = list
      .appendChild(document.createElementNS(HTML_NS, 'li'))
      .appendChild(document.createElementNS(HTML_NS, 'button'));
    copyWordButton.classList.add('-icon-label');

    if (entryToCopy) {
      const icon = renderClipboard();
      icon.classList.add('icon');
      copyWordButton.append(icon);
    }
    const copyWordLabel = document.createElementNS(HTML_NS, 'span');
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

  // Cancel
  const cancelButton = copyOverlay.appendChild(
    document.createElementNS(HTML_NS, 'button')
  );
  cancelButton.classList.add('cancel-button');

  const crossSvg = document.createElementNS(SVG_NS, 'svg');
  crossSvg.classList.add('icon');
  crossSvg.setAttribute('viewBox', '0 0 24 24');
  crossSvg.setAttribute('stroke', 'currentColor');
  crossSvg.setAttribute('stroke-width', '2');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'M6 18L18 6M6 6l12 12');
  crossSvg.append(path);
  cancelButton.append(crossSvg);

  cancelButton.append(
    browser.i18n.getMessage('content_copy_overlay_cancel_button')
  );
  cancelButton.lang = getLangTag();

  return copyOverlay;
}

function renderButtonWithPreview({
  label,
  previewText,
}: {
  label: string;
  previewText?: string;
}) {
  const button = document.createElementNS(HTML_NS, 'button');
  button.append(label);
  button.lang = getLangTag();

  if (previewText) {
    const previewRow = document.createElementNS(HTML_NS, 'div');
    previewRow.setAttribute('role', 'presentation');
    previewRow.classList.add('copy-preview');

    const icon = renderClipboard();
    icon.classList.add('icon');
    previewRow.append(icon);

    const span = document.createElementNS(HTML_NS, 'span');
    span.append(previewText);
    span.lang = 'ja';
    previewRow.append(span);

    button.append(previewRow);
  }

  return button;
}
