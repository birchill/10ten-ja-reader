// The following is based heavily on:
//
// http://ginstrom.com/scribbles/2009/04/28/converting-kanji-numbers-to-integers-with-python/

// Following are the digits we recognize for numbers specified as a series of
// digits e.g. 五六. We call this a transliterated number.
const transliterateMap = new Map([
  ['〇', 0],
  ['一', 1],
  ['二', 2],
  ['三', 3],
  ['四', 4],
  ['五', 5],
  ['六', 6],
  ['七', 7],
  ['八', 8],
  ['九', 9],
  ['０', 0],
  ['１', 1],
  ['２', 2],
  ['３', 3],
  ['４', 4],
  ['５', 5],
  ['６', 6],
  ['７', 7],
  ['８', 8],
  ['９', 9],
  ['0', 0],
  ['1', 1],
  ['2', 2],
  ['3', 3],
  ['4', 4],
  ['5', 5],
  ['6', 6],
  ['7', 7],
  ['8', 8],
  ['9', 9],
  ['.', -1],
  ['。', -1],
  ['．', -1],
]);

// Following are the digits we recognize for numbers that specify powers of 10,
// e.g. 五十六.
const kanjiToNumberMap = new Map<string, number>([
  ['〇', 0],
  ['一', 1],
  ['二', 2],
  ['三', 3],
  ['四', 4],
  ['五', 5],
  ['六', 6],
  ['七', 7],
  ['八', 8],
  ['九', 9],
  ['０', 0],
  ['１', 1],
  ['２', 2],
  ['３', 3],
  ['４', 4],
  ['５', 5],
  ['６', 6],
  ['７', 7],
  ['８', 8],
  ['９', 9],
  ['0', 0],
  ['1', 1],
  ['2', 2],
  ['3', 3],
  ['4', 4],
  ['5', 5],
  ['6', 6],
  ['7', 7],
  ['8', 8],
  ['9', 9],
  ['十', 10],
  ['百', 100],
  ['千', 1000],
  ['万', 10000],
  ['億', 100000000],
  ['兆', 1000000000000],
  ['.', -1],
  ['。', -1],
  ['．', -1],
]);

export function parseNumber(inputText: string): number | null {
  // Drop any commas in the string first
  const text = inputText.replace(/[,、]/g, '');

  // Try a transliterated number first since inputs like 二二一 would also be
  // found in kanjiToNumberMap.
  let digits = [...text].map((ch) => transliterateMap.get(ch));
  if (digits.length && !digits.some((digit) => typeof digit === 'undefined')) {
    if (digits.indexOf(-1) === -1) {
      return parseInt(digits.join(''), 10);
    } else {
      return parseFloat(
        digits.map((digit) => (digit === -1 ? '.' : digit)).join('')
      );
    }
  }

  // Otherwise, try processing as a number with powers of ten.
  digits = [...text].map((ch) => kanjiToNumberMap.get(ch));
  if (!digits.length || digits.some((ch) => typeof ch === 'undefined')) {
    // If that failed, it's not something we know how to parse as a number.
    return null;
  }

  let numbers = digits as Array<number>;

  // Special case where we have a series of digits followed by a power of ten,
  // e.g. 39,800万円 and 11,786百万. These don't follow the usual rules of
  // numbers so we treat them separately.
  const digitsAndPowersOfTen = getDigitsAndPowersOfTen(numbers);
  if (digitsAndPowersOfTen) {
    const [digits, powersOfTen] = digitsAndPowersOfTen;
    const multiplier = digits.reduce((acc, d) => acc * 10 + d, 0);
    const base = powersOfTen.reduce((acc, p) => acc * p, 1);
    return multiplier * base;
  }

  let result = 0;

  while (numbers.length > 1) {
    const [first, second, ...rest] = numbers;

    // Detect strings of digits and combine them
    if (first < 10 && second < 10) {
      let decimal = 0;
      while (numbers.length > 1 && numbers[1] < 10) {
        if (numbers[1] === -1) {
          if (decimal) {
            return null;
          }
          decimal = 1;
          numbers = [numbers[0], ...numbers.slice(2)];
        } else if (decimal) {
          numbers = [
            numbers[0] + numbers[1] * Math.pow(10, -decimal++),
            ...numbers.slice(2),
          ];
        } else {
          numbers = [numbers[0] * 10 + numbers[1], ...numbers.slice(2)];
        }
      }
      continue;
    }

    if (!validSequence(first, second)) {
      return null;
    }

    if (second < first) {
      // Detected a step down, check if there are any multipliers on what we
      // currently have.
      if (rest.some((x) => x > first)) {
        numbers = breakDownNumbers(numbers);
      } else {
        // No multipliers on what we currently have accumualated so store what
        // we have and process the remainder.
        result += first;
        numbers = [second, ...rest];
      }
    } else {
      numbers = [first * second, ...rest];
    }
  }

  return result + (numbers.length ? numbers[0] : 0);
}

function getDigitsAndPowersOfTen(
  arr: Array<number>
): [Array<number>, Array<number>] | null {
  let lastPowerOfTen = arr.length;
  while (lastPowerOfTen && arr[lastPowerOfTen - 1] >= 100) {
    --lastPowerOfTen;
  }

  if (lastPowerOfTen === 0 || lastPowerOfTen === arr.length) {
    return null;
  }

  const digits = arr.slice(0, lastPowerOfTen);
  if (!digits.every((d) => d >= 0 && d < 10)) {
    return null;
  }

  return [digits, arr.slice(lastPowerOfTen)];
}

function validSequence(c1: number, c2: number): boolean {
  // If we have xxx万, xxx億, xxx兆 then the only requirement is that xxx is less
  // than the 'base'.
  if (c2 >= 10000 && c1 < c2) {
    return true;
  }
  if (c1 >= 10000 && c2 <= 1000) {
    return true;
  }
  if (c1 >= 100 && c2 < c1 && c2 >= 10 && c2 <= 1000) {
    return true;
  }

  // Don't allow 一十 or 一百
  if (c1 === 1 && (c2 === 10 || c2 === 100)) {
    return false;
  }

  return c1 < 10 !== c2 < 10;
}

function breakDownNumbers(numbers: Array<number>): Array<number> {
  // If this is called, we already know that second < first.
  //
  // Furthermore, we know that there is something after 'second' that is
  // greater than 'first'.
  //
  // Most often, the second value will be the 'unit' (i.e. value < 10) and the
  // third value will be the base-10 multiplier.
  //
  // e.g. [300, 2, 10, 10000], i.e. 3,200,000
  //
  // In this case we want to multiply the second and third values together
  //
  // i.e. [300, 20, 10000]
  //
  // There are two cases where we can't do this:
  //
  // (a) When the third value is actually a multiplier not just on the second
  //     value, but on everything we've accumulated in the first value.
  //
  //     In this case it will be greater than the first value.
  //
  //     e.g. [300, 2, 10000], i.e. 3,020,000
  //
  //     Here we can add the first two together and proceed.
  //
  //     i.e. [302, 10000]
  //
  // (b) When the third value is less than the second, i.e. is _not_ a
  //     multiplier on it.
  //
  //     This mostly happens when lining up powers of 10 since they we don't
  //     need a 'unit' in this case.
  //
  //     e.g. [1000, 100, 10, 10000], i.e. 11,100,000
  //
  //     Here too we can just add the first two together and proceed.
  //
  //     i.e. [1100, 10, 10000]

  const [first, second, third, ...rest] = numbers;
  if (first < third || third < second) {
    return [first + second, third, ...rest];
  } else {
    return [first, second * third, ...rest];
  }
}

export interface NumberMeta {
  type: 'number';
  value: number;
  src: string;
  matchLen: number;
}

// This very long regex is really just trying to say: only recognize a number
// that
//
// - is at least two digits long, and
// - has at least one kanji digit
//
const numberRegex =
  /^([一二三四五六七八九十百千万億兆京][0-9.,０-９。．、〇一二三四五六七八九十百千万億兆京]+)|([0-9,０-９、]+([.。．][0-9０-９]+)?[〇一二三四五六七八九十百千万億兆京][0-9.,０-９。．、〇一二三四五六七八九十百千万億兆京]*)/;

export function extractNumberMetadata(text: string): NumberMeta | undefined {
  const matches = numberRegex.exec(text);
  if (!matches || matches.index !== 0) {
    return undefined;
  }

  const valueStr = matches[0];
  if (!valueStr) {
    return undefined;
  }

  const value = parseNumber(valueStr);
  if (!value) {
    return undefined;
  }

  return { type: 'number', value, src: valueStr, matchLen: valueStr.length };
}
