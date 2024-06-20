import { MajorDataSeries } from '@birchill/jpdict-idb';

import { CopyEntry } from './copy-text';
import { QueryResult } from './query';

export function getCopyEntryFromResult({
  series,
  result,
  index,
}: {
  series: MajorDataSeries;
  result: QueryResult;
  index: number;
}): CopyEntry | null {
  // Get the actual index to use.
  let numberOfCopyableEntries;
  if (series === 'words') {
    const { namePreview } = result;
    numberOfCopyableEntries =
      (namePreview?.names.length ?? 0) + (result.words?.data.length ?? 0);
  } else if (series === 'names') {
    numberOfCopyableEntries = result.names?.data.length ?? 0;
  } else if (series === 'kanji') {
    numberOfCopyableEntries = result.kanji?.data.length ?? 0;
  }

  if (!numberOfCopyableEntries) {
    return null;
  }

  const wrappedIndex = index % numberOfCopyableEntries;

  // Find the corresponding entry
  if (series === 'words') {
    const { namePreview } = result;
    const namesLength = namePreview?.names.length ?? 0;
    const inNamePreviewRange = wrappedIndex < namesLength;

    if (inNamePreviewRange) {
      return { type: 'name', data: namePreview!.names[wrappedIndex] };
    }

    return result.words
      ? { type: 'word', data: result.words.data[wrappedIndex - namesLength] }
      : null;
  } else if (series === 'names') {
    return result.names
      ? { type: 'name', data: result.names.data[wrappedIndex] }
      : null;
  } else if (series === 'kanji') {
    return result.kanji
      ? { type: 'kanji', data: result.kanji.data[wrappedIndex] }
      : null;
  }

  return null;
}
