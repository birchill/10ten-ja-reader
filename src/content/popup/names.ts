import { h } from 'preact';

import type { NameResult } from '../../background/search-result';
import { html } from '../../utils/builder';

import { NameTable } from './Names/NameTable';
import { mountPopupComponent } from './mount';
import { PopupOptionsProvider } from './options-context';
import type { ShowPopupOptions } from './show-popup';

type RenderNamesOptions = Pick<
  ShowPopupOptions,
  | 'copyState'
  | 'fontSize'
  | 'fxData'
  | 'interactive'
  | 'meta'
  | 'onStartCopy'
  | 'playReadingsShortcuts'
  | 'preferredUnits'
  | 'ttsPlayback'
>;

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
  options: RenderNamesOptions;
  popupHost: Element;
}): HTMLElement {
  const containerElement = html('div', { class: 'entry-data' });

  mountPopupComponent({
    popupHost,
    container: containerElement,
    vnode: h(
      PopupOptionsProvider,
      {
        interactive: options.interactive,
        fontSize: options.fontSize,
        playReadingsShortcuts: options.playReadingsShortcuts,
      },
      h(NameTable, {
        entries,
        matchLen,
        more,
        fxData: options.fxData,
        preferredUnits: options.preferredUnits,
        meta: options.meta,
        copyState: options.copyState,
        onStartCopy: options.onStartCopy,
        ttsPlayback: options.ttsPlayback,
      })
    ),
  });

  return containerElement;
}
