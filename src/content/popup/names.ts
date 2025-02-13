import { h, render } from 'preact';

import { NameResult } from '../../background/search-result';
import { html } from '../../utils/builder';

import { NameTable } from './Names/NameTable';
import { ShowPopupOptions } from './show-popup';

export function renderNamesEntries({
  entries,
  matchLen,
  more,
  options,
}: {
  entries: Array<NameResult>;
  matchLen: number;
  more: boolean;
  options: ShowPopupOptions;
}): HTMLElement {
  const containerElement = html('div', { class: 'entry-data' });

  render(
    h(NameTable, {
      entries,
      matchLen,
      more,
      fxData: options.fxData,
      preferredUnits: options.preferredUnits,
      meta: options.meta,
      copyState: options.copyState,
      onStartCopy: options.onStartCopy,
    }),
    containerElement
  );

  return containerElement;
}
