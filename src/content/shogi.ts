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
  /[^1-9１－９一二三四五六七八九同仝歩兵香桂銀金角飛玉王と成香桂銀馬龍竜打引寄上行入右左直行入不生]/;

// Based on https://devurandom.xyz/shogi_parser.html by @devurandom
// which in turn is based on the description at
// https://en.wikipedia.org/wiki/Shogi_notation#Japanese_notation
const shogiRegex =
  /([▲△☗☖]?)([1-9１-９一二三四五六七八九][1-9１-９一二三四五六七八九]|[同仝])(歩|兵|香|桂|銀|金|角|飛|玉|王|と|成香|成桂|成銀|馬|龍|竜)([打引寄上行入右左直行入]?)(成|不成|生)?/;

const sides = new Map<string, ShogiSideType>([
  ['▲', 'black'],
  ['△', 'white'],
  ['☗', 'black'],
  ['☖', 'white'],
]);

const pieces = new Map<string, ShogiPieceType>([
  // TODO: Shorthand notation
  ['歩', 'p'],
  ['兵', 'p'],
  ['香', 'l'],
  ['桂', 'n'],
  ['銀', 's'],
  ['角', 'b'],
  ['飛', 'r'],
  ['金', 'g'],
  ['と', 'pro_p'],
  ['成香', 'pro_l'],
  ['成桂', 'pro_n'],
  ['成銀', 'pro_s'],
  ['馬', 'pro_b'],
  ['龍', 'pro_r'],
  ['竜', 'pro_r'],
  ['玉', 'k'],
  ['王', 'k'],
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
  if (destStr !== '同' && destStr !== '仝') {
    dest = destStr.split('').map(parseNumber) as [number, number];
  }

  // Piece
  const piece = pieces.get(pieceStr)!;

  // Movement
  const movement = movements.get(movementStr);

  // Promotion
  let promotion: boolean | undefined;
  if (promotionStr === '成' || promotionStr === '生') {
    promotion = true;
  } else if (promotionStr === '不成') {
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
