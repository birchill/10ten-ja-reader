import { h, render } from 'preact';

import { WordResult } from '../../background/search-result';
import { html } from '../../utils/builder';

import { NamePreview } from '../query';

import { WordTable } from './Words/WordTable';
import type { ShowPopupOptions } from './show-popup';

type Props = {
  entries: Array<WordResult>;
  matchLen: number;
  more: boolean;
  namePreview: NamePreview | undefined;
  options: ShowPopupOptions;
  title: string | undefined;
};

export function renderWordEntries(props: Props): HTMLElement {
  const containerElement = html('div', { class: 'entry-data' });

  render(h(WordTable, { ...props }), containerElement);

  return containerElement;
}
