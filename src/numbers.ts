// The following is based heavily on:
//
// http://ginstrom.com/scribbles/2009/04/28/converting-kanji-numbers-to-integers-with-python/

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
  let stuffs = [...text].map((ch) => transliterateMap.get(ch));
  // we check transliterateMap first
  // because 二二一 would also pass the kanjiToNumberMap check
  if (!stuffs.length || stuffs.some((ch) => typeof ch === 'undefined')) {
    // may contain 十百千万, or not a number at all
    stuffs = [...text].map((ch) => kanjiToNumberMap.get(ch));
    if (!stuffs.length || stuffs.some((ch) => typeof ch === 'undefined')) {
      return null;
    }
  } else {
    //just transliterate kanji into digits
    return parseInt(stuffs.join(''));
  }

  let numbers = stuffs as Array<number>;
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
