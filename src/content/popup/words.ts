import { h, render } from 'preact';

import { WordResult } from '../../background/search-result';
import { html } from '../../utils/builder';

import { NamePreview } from '../query';

import { WordTable } from './Words/WordTable';
import { PopupOptionsProvider } from './options-context';
import type { ShowPopupOptions } from './show-popup';

export function renderWordEntries({
  entries,
  matchLen,
  more,
  namePreview,
  options,
  title,
}: {
  entries: Array<WordResult>;
  matchLen: number;
  more: boolean;
  namePreview: NamePreview | undefined;
  options: ShowPopupOptions;
  title: string | undefined;
}): HTMLElement {
  const containerElement = html('div', { class: 'entry-data' });

  render(
    h(
      PopupOptionsProvider,
      { ...options },
      h(WordTable, {
        entries,
        matchLen,
        more,
        namePreview,
        title,
        meta: options.meta,
        config: {
          readingOnly: !options.showDefinitions,
          fx: options.fxData,
          fontSize: options.fontSize || 'normal',
          ...options,
        },
        copyState: options.copyState,
        onStartCopy: options.onStartCopy,
      })
    ),
    containerElement
  );

  return containerElement;
}
