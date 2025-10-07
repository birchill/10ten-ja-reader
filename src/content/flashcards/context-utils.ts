import type { SourceRuby } from './source-context';

/**
 * Represents either a string or a SourceRuby object in context arrays.
 */
export type ContextPart = string | SourceRuby;

// ----------------------------------------------------------------------------
//
// Array iteration helpers
//
// ----------------------------------------------------------------------------

/**
 * Iterates over an array in reverse order, yielding items and their indices.
 * Useful for processing preludes from end to start.
 */
export function* reverseIterator<T>(
  arr: Array<T>
): Generator<[item: T, index: number], void, unknown> {
  for (let i = arr.length - 1; i >= 0; i--) {
    yield [arr[i]!, i];
  }
}

/**
 * Iterates over a string in reverse order, yielding characters and their indices.
 * Also provides the previous and next characters for context.
 */
export function* reverseStringIterator(
  str: string
): Generator<
  [char: string, index: number, before: string, after: string],
  void,
  unknown
> {
  for (let i = str.length - 1; i >= 0; i--) {
    const before = str[i - 1] || '';
    const char = str[i]!;
    const after = str[i + 1] || '';
    yield [char, i, before, after];
  }
}

/**
 * Iterates over a string forward, yielding characters and their indices.
 * Also provides the previous and next characters for context.
 */
export function* forwardStringIterator(
  str: string
): Generator<
  [char: string, index: number, before: string, after: string],
  void,
  unknown
> {
  for (let i = 0; i < str.length; i++) {
    const before = str[i - 1] || '';
    const char = str[i]!;
    const after = str[i + 1] || '';
    yield [char, i, before, after];
  }
}

// ----------------------------------------------------------------------------
//
// String merging
//
// ----------------------------------------------------------------------------

/**
 * Merges adjacent string parts in an array, leaving ruby objects untouched.
 */
export function mergeAdjacentStrings(
  arr: Array<ContextPart>
): Array<ContextPart> {
  const merged: Array<ContextPart> = [];

  for (const part of arr) {
    const lastPart = merged.at(-1);
    if (typeof part === 'string' && typeof lastPart === 'string') {
      merged.splice(-1, 1, lastPart + part);
    } else {
      merged.push(part);
    }
  }

  return merged;
}

// ----------------------------------------------------------------------------
//
// Length calculation
//
// ----------------------------------------------------------------------------

function getPartLength(part: ContextPart): number {
  if (typeof part === 'string') {
    return part.length;
  }

  return part.base.reduce((sum, str) => sum + str.length, 0);
}

// ----------------------------------------------------------------------------
//
// Character set checking
//
// ----------------------------------------------------------------------------

/**
 * Creates a lazy-initialized character set checker.
 * The set is only created on first use.
 */
export function createCharSetChecker(
  chars: ReadonlyArray<string>
): (ch: string) => boolean {
  let charSet: Set<string> | null = null;

  return (ch: string): boolean => {
    if (!charSet) {
      charSet = new Set(chars);
    }
    return charSet.has(ch);
  };
}

// ----------------------------------------------------------------------------
//
// Max length trimming
//
// ----------------------------------------------------------------------------

export type TrimDirection = 'forward' | 'reverse';

export type TrimOptions = {
  maxLength: number;
  direction: TrimDirection;
  addEllipsis?: boolean;
  minLengthBeforeMatch?: number;
};

/**
 * Trims an array of context parts to a maximum length.
 * Can trim from the start (reverse) or end (forward).
 */
export function trimByMaxLength(
  parts: Array<ContextPart>,
  options: TrimOptions
): Array<ContextPart> {
  const {
    maxLength,
    direction,
    addEllipsis = true,
    minLengthBeforeMatch = 0,
  } = options;

  if (direction === 'reverse') {
    return trimReverseByMaxLength(parts, maxLength, addEllipsis);
  } else {
    return trimForwardByMaxLength(
      parts,
      maxLength,
      addEllipsis,
      minLengthBeforeMatch
    );
  }
}

function trimReverseByMaxLength(
  parts: Array<ContextPart>,
  maxLength: number,
  addEllipsis: boolean
): Array<ContextPart> {
  let length = 0;
  const result: Array<ContextPart> = [];

  for (const [part, i] of reverseIterator(parts)) {
    length += getPartLength(part);

    const needsContinuation = addEllipsis && i !== 0;
    const lengthWithContinuation = needsContinuation ? length + 1 : length;

    if (lengthWithContinuation < maxLength) {
      result.unshift(part);
      continue;
    }

    if (lengthWithContinuation === maxLength) {
      result.unshift(part);
      if (needsContinuation) {
        result.unshift('…');
      }
      break;
    }

    // This part puts us over the limit
    if (typeof part === 'object') {
      if (addEllipsis) {
        result.unshift('…');
      }
      break;
    }

    const overflow = length + (addEllipsis ? 1 : 0) - maxLength;
    if (overflow > 0 && overflow < part.length) {
      result.unshift((addEllipsis ? '…' : '') + part.slice(overflow));
    } else if (addEllipsis) {
      result.unshift('…');
    }
    break;
  }

  return result;
}

function trimForwardByMaxLength(
  parts: Array<ContextPart>,
  maxLength: number,
  addEllipsis: boolean,
  minLengthBeforeMatch: number
): Array<ContextPart> {
  let length = 0;
  const result: Array<ContextPart> = [];

  for (const [i, part] of parts.entries()) {
    length += getPartLength(part);

    // Ensure we don't trim inside the protected region
    if (length <= minLengthBeforeMatch) {
      result.push(part);
      continue;
    }

    const needsContinuation = addEllipsis && i !== parts.length - 1;
    const lengthWithContinuation = needsContinuation ? length + 1 : length;

    if (lengthWithContinuation < maxLength) {
      result.push(part);
      continue;
    }

    if (lengthWithContinuation === maxLength) {
      result.push(part);
      if (needsContinuation) {
        result.push('…');
      }
      break;
    }

    // This part puts us over the limit
    if (typeof part === 'object') {
      if (addEllipsis) {
        result.push('…');
      }
      break;
    }

    const overflow = length + (addEllipsis ? 1 : 0) - maxLength;
    const trimAt = part.length - overflow;
    if (trimAt > 0) {
      result.push(part.slice(0, trimAt) + (addEllipsis ? '…' : ''));
    } else if (addEllipsis) {
      result.push('…');
    }
    break;
  }

  return result;
}
