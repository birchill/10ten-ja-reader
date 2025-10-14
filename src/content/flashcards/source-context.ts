import {
  createCharSetChecker,
  forwardStringIterator,
  mergeAdjacentStrings,
  reverseIterator,
  reverseStringIterator,
  trimByMaxLength,
} from './context-utils';

export type SourceContext = {
  /**
   * Text that comes from before the source text we looked up.
   */
  prelude: Array<string | SourceRuby>;

  /**
   * The text to look up plus some following text beyond what is needed for
   * the maximum lookup length.
   */
  source: Array<string | SourceRuby>;

  /**
   * Indicates the offset within a ruby base or transcription (if
   * `inTranscription` is true) in UTF-16 bytes.
   */
  sourceOffset: number;

  /**
   * True if the source text is from a ruby transcription (i.e. an <rt>
   * element).
   */
  inTranscription?: boolean;
};

export type SourceRuby = {
  /**
   * The base text of a ruby element, split up into individual base spans.
   */
  base: Array<string>;

  /**
   * The transcription text of a ruby element, split up into individual
   * transcription spans.
   */
  transcription: Array<string>;
};

export function trimSourceContext(
  sourceContext: SourceContext,
  textLen: number
) {
  // Merge adjacent strings
  sourceContext.prelude = mergeAdjacentStrings(sourceContext.prelude);
  sourceContext.source = mergeAdjacentStrings(sourceContext.source);

  // Trim by hard stops
  sourceContext.prelude = trimPreludeByHardStops(sourceContext.prelude);
  sourceContext.source = trimSourceByHardStops(sourceContext.source);

  // Trim whitespace
  sourceContext.prelude = trimPreludeWhitespace(sourceContext.prelude);

  // Trim by max length
  //
  // We'll further trim the content when we go to use it but this just ensures
  // we don't end up trying to pass around megabytes of text if the user looks
  // up text in a really crazy document.
  sourceContext.prelude = trimPreludeByMaxLength(sourceContext.prelude);
  sourceContext.source = trimSourceByMaxLength(sourceContext.source, textLen);
}

// ----------------------------------------------------------------------------
//
// Hard stops
//
// ----------------------------------------------------------------------------

function trimPreludeByHardStops(
  prelude: Array<string | SourceRuby>
): Array<string | SourceRuby> {
  const result: Array<string | SourceRuby> = [];

  for (const [part] of reverseIterator(prelude)) {
    if (typeof part !== 'string') {
      result.unshift(part);
      continue;
    }

    for (const [char, i] of reverseStringIterator(part)) {
      if (isHardStop(char)) {
        if (i + 1 < part.length) {
          result.unshift(part.substring(i + 1));
        }
        return result;
      }
    }

    result.unshift(part);
  }

  return result;
}

function trimSourceByHardStops(
  source: Array<string | SourceRuby>
): Array<string | SourceRuby> {
  const result: Array<string | SourceRuby> = [];

  for (const part of source) {
    if (typeof part !== 'string') {
      result.push(part);
      continue;
    }

    for (const [char, i] of forwardStringIterator(part)) {
      if (isHardStop(char)) {
        result.push(part.substring(0, i + 1));
        return result;
      }
    }

    result.push(part);
  }

  return result;
}

const isHardStop = createCharSetChecker(['。', '！', '？', '!', '?']);

// ----------------------------------------------------------------------------
//
// Whitespace
//
// ----------------------------------------------------------------------------

function trimPreludeWhitespace(
  prelude: Array<string | SourceRuby>
): Array<string | SourceRuby> {
  let foundStart = false;

  return prelude.reduce(
    (acc, part) => {
      if (foundStart) {
        acc.push(part);
        return acc;
      }

      if (typeof part === 'string') {
        const trimmed = part.trimStart();
        if (trimmed.length) {
          acc.push(trimmed);
          foundStart = true;
        }
      } else {
        acc.push(part);
        foundStart = true;
      }
      return acc;
    },
    [] as Array<string | SourceRuby>
  );
}

// ----------------------------------------------------------------------------
//
// Max length
//
// ----------------------------------------------------------------------------

export const MAX_SOURCE_CONTEXT_PRELUDE_LENGTH = 40;
export const MAX_SOURCE_CONTEXT_POSTLUDE_LENGTH = 40;

function trimPreludeByMaxLength(
  prelude: Array<string | SourceRuby>
): Array<string | SourceRuby> {
  return trimByMaxLength(prelude, {
    maxLength: MAX_SOURCE_CONTEXT_PRELUDE_LENGTH,
    direction: 'reverse',
    addEllipsis: true,
  });
}

function trimSourceByMaxLength(
  source: Array<string | SourceRuby>,
  textLen: number
): Array<string | SourceRuby> {
  return trimByMaxLength(source, {
    maxLength: textLen + MAX_SOURCE_CONTEXT_POSTLUDE_LENGTH,
    direction: 'forward',
    addEllipsis: true,
  });
}
