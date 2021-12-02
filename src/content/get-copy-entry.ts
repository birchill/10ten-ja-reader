import {
  KanjiSearchResult,
  NameSearchResult,
  WordSearchResult,
} from '../background/search-result';
import { CopyEntry } from './copy-text';

export function getCopyEntryFromResult({
  result,
  index,
}: {
  result: WordSearchResult | NameSearchResult | KanjiSearchResult;
  index: number;
}): CopyEntry | null {
  let wrappedIndex = index;
  if (result.type === 'words' || result.type === 'names') {
    wrappedIndex = wrappedIndex % result.data.length;
  }

  if (wrappedIndex < 0) {
    console.error('Bad copy index', index);
    return null;
  }

  switch (result.type) {
    case 'kanji':
      return { type: 'kanji', data: result.data };
    case 'names':
      return { type: 'name', data: result.data[wrappedIndex] };
    case 'words':
      return { type: 'word', data: result.data[wrappedIndex] };
  }
}
