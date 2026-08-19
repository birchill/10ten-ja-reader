import type { MajorDataSeries } from '@birchill/jpdict-idb';
import { h } from 'preact';

import type { CopyType } from '../../common/copy-keys';
import type { ReferenceAbbreviation } from '../../common/refs';
import { html } from '../../utils/builder';

import type { QueryResult } from '../query';

import { CopyOverlay } from './CopyOverlay/CopyOverlay';
import type { CopyState } from './copy-state';
import { mountPopupComponent } from './mount';

export function renderCopyOverlay(props: {
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
  showRomaji?: boolean;
}): HTMLDivElement {
  const containerElement = html('div', { class: 'tp:flex' });

  mountPopupComponent(containerElement, h(CopyOverlay, props));

  return containerElement;
}
