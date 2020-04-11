// The following is based heavily on:
//
// http://ginstrom.com/scribbles/2009/04/28/converting-kanji-numbers-to-integers-with-python/
//
// It is very basic (e.g. doesn't cover 三〇九 etc.) because it is only intended
// to be used for years with Japanese eras.

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

export function kanjiToNumber(text: string): number | null {
  const stuffs = [...text].map((ch) => kanjiToNumberMap.get(ch));
  if (!stuffs.length || stuffs.some((ch) => typeof ch === 'undefined')) {
    return null;
  }

  let numbers = stuffs as Array<number>;
  let result = 0;

  while (numbers.length > 1) {
    const [first, second, ...rest] = numbers;

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
