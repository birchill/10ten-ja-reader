import { h } from 'preact';

import type { NameResult } from '../../background/search-result';
import { html } from '../../utils/builder';

import { NameTable } from './Names/NameTable';
import { mountPopupComponent } from './mount';
import type { ShowPopupOptions } from './show-popup';

export function renderNamesEntries({
  entries,
  matchLen,
  more,
  options,
  popupHost,
}: {
  entries: Array<NameResult>;
  matchLen: number;
  more: boolean;
  options: ShowPopupOptions;
  popupHost: Element;
}): HTMLElement {
  const containerElement = html('div', { class: 'entry-data' });

  mountPopupComponent({
    popupHost,
    container: containerElement,
    vnode: h(NameTable, {
      entries,
      matchLen,
      more,
      fxData: options.fxData,
      preferredUnits: options.preferredUnits,
      meta: options.meta,
      copyState: options.copyState,
      onStartCopy: options.onStartCopy,
    }),
  });

  return containerElement;
}
