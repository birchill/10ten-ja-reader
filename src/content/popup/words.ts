import { h } from 'preact';

import type { WordResult } from '../../background/search-result';
import { html } from '../../utils/builder';

import type { NamePreview } from '../query';

import { WordTable } from './Words/WordTable';
import { mountPopupComponent } from './mount';
import { PopupOptionsProvider } from './options-context';
import type { ShowPopupOptions } from './show-popup';

export function renderWordEntries({
  entries,
  matchLen,
  more,
  namePreview,
  options,
  popupHost,
  title,
}: {
  entries: Array<WordResult>;
  matchLen: number;
  more: boolean;
  namePreview: NamePreview | undefined;
  options: ShowPopupOptions;
  popupHost: Element;
  title: string | undefined;
}): HTMLElement {
  const containerElement = html('div', { class: 'entry-data' });

  mountPopupComponent({
    popupHost,
    container: containerElement,
    vnode: h(
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
  });

  return containerElement;
}
