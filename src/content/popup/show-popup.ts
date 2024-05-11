import type { MajorDataSeries } from '@birchill/jpdict-idb';

import type {
  AccentDisplay,
  ContentConfigParams,
  FontSize,
  PartOfSpeechDisplay,
} from '../../common/content-config-params';
import type { CopyType } from '../../common/copy-keys';
import type { ReferenceAbbreviation } from '../../common/refs';

import type { DisplayMode } from '../popup-state';
import type { QueryResult } from '../query';

import type { CopyState } from './copy-state';
import type { SelectionMeta } from '../meta';
import { renderPopup } from './render-popup';

export type ShowPopupOptions = {
  accentDisplay: AccentDisplay;
  bunproDisplay: boolean;
  closeShortcuts?: ReadonlyArray<string>;
  container?: HTMLElement;
  copyNextKey: string;
  copyState: CopyState;
  copy?: {
    includeAllSenses: boolean;
    includeLessCommonHeadwords: boolean;
    includePartOfSpeech: boolean;
  };
  dictToShow: MajorDataSeries;
  dictLang?: string;
  displayMode: DisplayMode;
  fontSize?: FontSize;
  fxData: ContentConfigParams['fx'];
  expandShortcuts?: ReadonlyArray<string>;
  isExpanded: boolean;
  kanjiReferences: Array<ReferenceAbbreviation>;
  meta?: SelectionMeta;
  onCancelCopy?: () => void;
  onStartCopy?: StartCopyCallback;
  onCopy?: (copyType: CopyType) => void;
  onClosePopup?: () => void;
  onExpandPopup?: () => void;
  onShowSettings?: () => void;
  onSwitchDictionary?: (newDict: MajorDataSeries | 'next' | 'prev') => void;
  onTogglePin?: () => void;
  pinShortcuts?: ReadonlyArray<string>;
  posDisplay: PartOfSpeechDisplay;
  popupStyle: string;
  showDefinitions: boolean;
  showPriority: boolean;
  showKanjiComponents?: boolean;
  switchDictionaryKeys: ReadonlyArray<string>;
  tabDisplay: 'top' | 'left' | 'right' | 'none';
  waniKaniVocabDisplay: 'hide' | 'show-matches';
};

export type StartCopyCallback = (
  index: number,
  trigger: 'touch' | 'mouse'
) => void;

export function showPopup(
  result: QueryResult | undefined,
  options: ShowPopupOptions
): HTMLElement | null {
  return renderPopup(result, options);
}
