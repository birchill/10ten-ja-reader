// The following is based heavily on:
//
// http://ginstrom.com/scribbles/2009/04/28/converting-kanji-numbers-to-integers-with-python/

// Following are the digits we recognize for numbers that specify powers of 10,
// e.g. 五十六.
const kanjiToNumberMap = new Map<string, number>([
  ['一', 1],
  ['二', 2],
  ['三', 3],
  ['四', 4],
  ['五', 5],
  ['六', 6],
  ['七', 7],
  ['八', 8],
  ['九', 9],
  ['十', 10],
  ['百', 100],
  ['千', 1000],
  ['万', 10000],
  ['億', 100000000],
  ['兆', 1000000000000],
]);

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
]);

function validNumber(c1: number, c2: number): boolean {
  if (c2 >= 10000 && c1 < c2) {
    return true;
  }
  if (c1 >= 10000 && c2 <= 1000) {
    return true;
  }
  if (c1 >= 100 && c2 < c1 && c2 >= 10 && c2 <= 1000) {
    return true;
  }
  if (c1 === 1 && (c2 === 10 || c2 === 100)) {
    return false;
  }

  return c1 < 10 !== c2 < 10;
}

export function kanjiToNumber(text: string): number | null {
  // Try a transliterated number first since the set of inputs like 二二一 would
  // also be found in kanjiToNumberMap.
  let digits = [...text].map((ch) => transliterateMap.get(ch));
  if (digits.length && !digits.some((ch) => typeof ch === 'undefined')) {
    return parseInt(digits.join(''), 10);
  }

  // Otherwise, try processing as a number with powers of ten.
  digits = [...text].map((ch) => kanjiToNumberMap.get(ch));
  if (!digits.length || digits.some((ch) => typeof ch === 'undefined')) {
    // If that failed, it's not something we know how to parse as a number.
    return null;
  }

  let numbers = digits as Array<number>;
  let result = 0;

  while (numbers.length > 1) {
    const [first, second, ...rest] = numbers;
    if (!validNumber(first, second)) {
      return null;
    }

    if (second < first) {
      if (rest.some((x) => x > first)) {
        numbers = breakDownNumbers(numbers);
      } else {
        result += first;
        numbers = [second, ...rest];
      }
    } else {
      numbers = [first * second, ...rest];
    }
  }

  return result + (numbers.length ? numbers[0] : 0);
}

function breakDownNumbers(numbers: Array<number>): Array<number> {
  const [first, second, third, ...rest] = numbers;
  if (first < third || third < second) {
    return [first + second, third, ...rest];
  } else {
    return [first, second * third, ...rest];
  }
}
