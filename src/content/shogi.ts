import { parseNumber } from './numbers';

export function lookForShogi({ nodeText }: { nodeText: string }): {
  textDelimiter: RegExp;
  textEnd: number;
} | null {
  // We only need to expand the search range if it starts with one of the piece
  // names. For other cases, the regular text lookup will find the necessary
  // text.
  if (!nodeText.length || !['▲', '△', '☗', '☖'].includes(nodeText[0])) {
    return null;
  }

  return {
    textDelimiter: shogiDelimeter,
    textEnd: nodeText.search(shogiDelimeter),
  };
}

// It feels a little imperialist to force these values into a more Western
// notation but by doing so we hope it's easier to map to localization keys
//
// (Safari in particular will probably have trouble with full-width string
// keys--it already has enough trouble with case sensitive keys.)

export type ShogiSideType = 'black' | 'white';

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
  side?: ShogiSideType;
  dest?: [number, number];
  piece: ShogiPieceType;
  movement?: ShogiMovementType;
  promotion?: boolean;
};

// This needs to be kept in sync with the regex below.
const shogiDelimeter =
  /[^1-9１－９一二三四五六七八九同仝－𠔼ド歩兵丶フゝ・香禾キ↑桂土銀ヨ角ク飛ヒ乙金人と成ナ馬マウ龍竜立リ玉王○打引寄上行入右左直行入不生]/u;

// Based on https://devurandom.xyz/shogi_parser.html by @devurandom
// which in turn is based on the description at
// https://en.wikipedia.org/wiki/Shogi_notation#Japanese_notation
const shogiRegex =
  /([▲△☗☖]?)([1-9１-９一二三四五六七八九][1-9１-９一二三四五六七八九]|[同仝－𠔼ド])(歩|兵|丶|フ|ゝ|・|香|禾|キ|↑|桂|土|銀|ヨ|角|ク|飛|ヒ|乙|金|人|と|成香|成禾|成キ|成↑|ナ香|ナ禾|ナキ|ナ↑|成桂|成土|ナ桂|ナ土|成銀|成ヨ|ナ銀|ナヨ|馬|マ|ウ|龍|竜|立|リ|玉|王|○)([打引寄上行入右左直行入]?)(成|ナ|不成|生|フナ|不ナ)?/u;

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
  const matches = shogiRegex.exec(text);
  if (!matches || matches.index !== 0) {
    return undefined;
  }

  const [, sideStr, destStr, pieceStr, movementStr, promotionStr] = matches;

  // Side
  const side = sideStr ? sides.get(sideStr) : undefined;

  // Destination
  let dest: [number, number] | undefined;
  if (!sameDest.has(destStr)) {
    dest = destStr.split('').map(parseNumber) as [number, number];
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
    side,
    dest,
    piece,
    movement,
    promotion,
  };
}
