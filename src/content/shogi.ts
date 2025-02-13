import { getCombinedCharRange, getNegatedCharRange } from '../utils/char-range';

import { parseNumber } from './numbers';

// ---------------------------------------------------------------------------
//
// Data types
//
// ---------------------------------------------------------------------------

// It feels a little imperialist to force these values into a more Western
// notation but by doing so we hope it's easier to map to localization keys
//
// (Safari in particular will probably have trouble with full-width string
// keys--it already has enough trouble with case sensitive keys.)

export type ShogiSideType = 'black' | 'white';

// If the third member of the tuple is defined, it indicates that the position
// is specified AND marked as being the same as the last move (e.g. ☖２四同歩).
export type ShogiDestType = [number, number] | [number, number, 1];

export type ShogiPieceType =
  | 'p'
  | 'l'
  | 'n'
  | 's'
  | 'b'
  | 'r'
  | 'g'
  | 'pro_p'
  | 'pro_l'
  | 'pro_n'
  | 'pro_s'
  | 'pro_b'
  | 'pro_r'
  | 'k';

export type ShogiMovementType =
  | 'drop'
  | 'down'
  | 'horiz'
  | 'up'
  | 'right'
  | 'left'
  | 'vert';

export type ShogiMeta = {
  type: 'shogi';
  matchLen: number;
  side?: ShogiSideType;
  // An undefined destination indicates that destination is the same as the
  // position of the last move. (If the position is specified AND marked as
  // being the same as the last move, e.g. ☖２四同歩, then a 3 element tuple
  // is used, with the last element being set to 1.)
  dest?: ShogiDestType;
  piece: ShogiPieceType;
  movement?: ShogiMovementType;
  promotion?: boolean;
};

// ---------------------------------------------------------------------------
//
// Parsing
//
// ---------------------------------------------------------------------------

export function lookForShogi({
  nodeText,
  textDelimiter: originalTextDelimiter,
}: {
  nodeText: string;
  textDelimiter: RegExp;
}): { textDelimiter: RegExp; textEnd: number } | null {
  if (!nodeText.length) {
    return null;
  }

  // If the test starts with one of the shogi side indicators, then we assume
  // that the text is a shogi move and we can use the shogi delimiter.
  if (['▲', '△', '☗', '☖'].includes(nodeText[0])) {
    return {
      textDelimiter: shogiDelimiter,
      textEnd: nodeText.search(shogiDelimiter),
    };
  }

  // Otherwise, if it starts with an Arabic number followed by a kanji number
  // OR it starts with one of the characters meaning "same position" then
  // expand the delimiter range to include all the shogi characters.
  if (!unprefixedShogiStart.test(nodeText)) {
    return null;
  }

  const expandedDelimiter = getCombinedCharRange([
    getNegatedCharRange(originalTextDelimiter),
    /[↑]/,
    // All the other characters such as 𠔼丶フゝ・○ etc. should already be
    // covered by `japaneseChar` so we don't need to add them here.
  ]);
  const textDelimiter = getNegatedCharRange(expandedDelimiter);

  return { textDelimiter, textEnd: nodeText.search(textDelimiter) };
}

// This needs to be kept in sync with the regexes below.
const shogiDelimiter =
  /[^▲△☗☖1-9１-９一二三四五六七八九同仝－𠔼ド歩兵丶フゝ・香禾キ↑桂土銀ヨ角ク飛ヒ乙金人と成ナ馬マウ龍竜立リ玉王○打引寄上行入右左直行入不生]/u;
const unprefixedShogiStart = /^[1-9１-９][一二三四五六七八九]|[同仝－𠔼ド]/u;

// Based on https://devurandom.xyz/shogi_parser.html by @devurandom
// which in turn is based on the description at
// https://en.wikipedia.org/wiki/Shogi_notation#Japanese_notation
const shogiRegex =
  /([▲△☗☖])([1-9１-９一二三四五六七八九][1-9１-９一二三四五六七八九][同仝－𠔼ド]?|[同仝－𠔼ド])(歩|兵|丶|フ|ゝ|・|香|禾|キ|↑|桂|土|銀|ヨ|角|ク|飛|ヒ|乙|金|人|と|成香|成禾|成キ|成↑|ナ香|ナ禾|ナキ|ナ↑|成桂|成土|ナ桂|ナ土|成銀|成ヨ|ナ銀|ナヨ|馬|マ|ウ|龍|竜|立|リ|玉|王|○)([打引寄上行入右左直行入]?)(成|ナ|不成|生|フナ|不ナ)?/u;
const shogiWithoutPrefixRegex =
  /([1-9１-９][一二三四五六七八九][同仝－𠔼ド]?|[同仝－𠔼ド])(歩|兵|丶|フ|ゝ|・|香|禾|キ|↑|桂|土|銀|ヨ|角|ク|飛|ヒ|乙|金|人|と|成香|成禾|成キ|成↑|ナ香|ナ禾|ナキ|ナ↑|成桂|成土|ナ桂|ナ土|成銀|成ヨ|ナ銀|ナヨ|馬|マ|ウ|龍|竜|立|リ|玉|王|○)([打引寄上行入右左直行入]?)(成|ナ|不成|生|フナ|不ナ)?/u;

const sides = new Map<string, ShogiSideType>([
  ['▲', 'black'],
  ['△', 'white'],
  ['☗', 'black'],
  ['☖', 'white'],
]);

const sameDest = new Set(['同', '仝', '－', '𠔼', 'ド']);

const pieces = new Map<string, ShogiPieceType>([
  ['歩', 'p'],
  ['兵', 'p'],
  ['丶', 'p'], // shorthand
  ['フ', 'p'], // shorthand
  ['ゝ', 'p'], // shorthand
  ['・', 'p'], // shorthand
  ['香', 'l'],
  ['禾', 'l'], // shorthand
  ['キ', 'l'], // shorthand
  ['↑', 'l'], // shorthand
  ['桂', 'n'],
  ['土', 'n'], // shorthand
  ['銀', 's'],
  ['ヨ', 's'], // shorthand
  ['角', 'b'],
  ['ク', 'b'], // shorthand
  ['飛', 'r'],
  ['ヒ', 'r'], // shorthand
  ['乙', 'r'], // shorthand
  ['金', 'g'],
  ['人', 'g'], // shorthand
  ['と', 'pro_p'],
  ['成香', 'pro_l'],
  ['成禾', 'pro_l'], // shorthand
  ['成キ', 'pro_l'], // shorthand
  ['成↑', 'pro_l'], // shorthand
  ['ナ香', 'pro_l'], // shorthand
  ['ナ禾', 'pro_l'], // shorthand
  ['ナキ', 'pro_l'], // shorthand
  ['ナ↑', 'pro_l'], // shorthand
  ['成桂', 'pro_n'],
  ['成土', 'pro_n'], // shorthand
  ['ナ桂', 'pro_n'], // shorthand
  ['ナ土', 'pro_n'], // shorthand
  ['成銀', 'pro_s'],
  ['成ヨ', 'pro_s'], // shorthand
  ['ナ銀', 'pro_s'], // shorthand
  ['ナヨ', 'pro_s'], // shorthand
  ['馬', 'pro_b'],
  ['マ', 'pro_b'], // shorthand
  ['ウ', 'pro_b'], // shorthand
  ['龍', 'pro_r'],
  ['竜', 'pro_r'],
  ['立', 'pro_r'], // shorthand
  ['リ', 'pro_r'], // shorthand
  ['玉', 'k'],
  ['王', 'k'],
  ['○', 'k'], // shorthand
]);

const movements = new Map<string, ShogiMovementType>([
  ['打', 'drop'],
  ['引', 'down'],
  ['寄', 'horiz'],
  ['上', 'up'],
  ['行', 'up'],
  ['入', 'up'],
  ['右', 'right'],
  ['左', 'left'],
  ['直', 'vert'],
]);

const promotions = new Set(['成', 'ナ']);
const nonPromotions = new Set(['不成', '生', 'フナ', '不ナ']);

export function extractShogiMetadata(text: string): ShogiMeta | undefined {
  let matches = shogiRegex.exec(text);
  if (!matches || matches.index !== 0) {
    matches = shogiWithoutPrefixRegex.exec(text);
    if (!matches || matches.index !== 0) {
      return undefined;
    }
    // Lined up the match indices line up between the two regexes
    matches.splice(1, 0, '');
  }

  const [src, sideStr, destStr, pieceStr, movementStr, promotionStr] = matches;

  // Side
  const side = sideStr ? sides.get(sideStr) : undefined;

  // Destination
  let dest: [number, number] | undefined;
  if (!sameDest.has(destStr)) {
    const parts = destStr.split('');
    dest = parts.slice(0, 2).map(parseNumber) as [number, number];
    // Check for a "same" indication (we need to check for > 2 instead of === 3
    // because if the "same" character is 𠔼 the string will have length 4 since
    // that charater is non-BMP).
    if (parts.length > 2) {
      dest.push(1);
    }
  }

  // Piece
  const piece = pieces.get(pieceStr)!;

  // Movement
  const movement = movements.get(movementStr);

  // Promotion
  let promotion: boolean | undefined;
  if (promotions.has(promotionStr)) {
    promotion = true;
  } else if (nonPromotions.has(promotionStr)) {
    promotion = false;
  }

  return {
    type: 'shogi',
    matchLen: src.length,
    side,
    dest,
    piece,
    movement,
    promotion,
  };
}

// ---------------------------------------------------------------------------
//
// Serialization
//
// ---------------------------------------------------------------------------

const standardPieceNotation: Record<ShogiPieceType, string> = {
  p: '歩',
  l: '香',
  n: '桂',
  s: '銀',
  b: '角',
  r: '飛',
  g: '金',
  pro_p: 'と',
  pro_l: '成香',
  pro_n: '成桂',
  pro_s: '成銀',
  pro_b: '馬',
  pro_r: '龍',
  k: '王',
};

const standardMovementNotation: Record<ShogiMovementType, string> = {
  drop: '打',
  down: '引',
  horiz: '寄',
  up: '上',
  right: '右',
  left: '左',
  vert: '直',
};

export function serializeShogi({
  side,
  dest,
  piece,
  movement,
  promotion,
}: {
  side?: ShogiSideType;
  dest?: ShogiDestType;
  piece: ShogiPieceType;
  movement?: ShogiMovementType;
  promotion?: boolean;
}): string {
  let result = '';
  if (side) {
    result += side === 'black' ? '☗' : '☖';
  }

  if (dest) {
    result += serializeShogiDest(dest);
  }
  if (!dest || dest.length === 3) {
    result += '同';
  }

  result += standardPieceNotation[piece];

  if (movement) {
    result += standardMovementNotation[movement];
  }

  if (typeof promotion === 'boolean') {
    result += promotion ? '成' : '不成';
  }

  return result;
}

const numberToKanji = [
  '〇',
  '一',
  '二',
  '三',
  '四',
  '五',
  '六',
  '七',
  '八',
  '九',
];

export function serializeShogiDest(dest: ShogiDestType): string {
  return `${String.fromCodePoint(dest[0] + 0xff10)}${numberToKanji[dest[1]]}`;
}
