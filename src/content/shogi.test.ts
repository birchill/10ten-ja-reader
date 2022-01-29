import { extractShogiMetadata } from './shogi';

describe('extractShogiMetadata', () => {
  it('parses shogi notation with all parts included', () => {
    expect(extractShogiMetadata('☗８三銀引成')).toEqual({
      side: 'black',
      dest: [8, 3],
      piece: 's',
      movement: 'down',
      promotion: true,
    });
  });
  it('parses the side', () => {
    expect(extractShogiMetadata('☗８三銀')!.side).toEqual('black');
    expect(extractShogiMetadata('▲８三銀')!.side).toEqual('black');
    expect(extractShogiMetadata('☖８三銀')!.side).toEqual('white');
    expect(extractShogiMetadata('△８三銀')!.side).toEqual('white');
    expect(extractShogiMetadata('８三銀')!.side).toEqual(undefined);
  });
  it('parses the destination', () => {
    expect(extractShogiMetadata('８三銀')!.dest).toEqual([8, 3]);
    expect(extractShogiMetadata('8三銀')!.dest).toEqual([8, 3]);
    expect(extractShogiMetadata('２４銀')!.dest).toEqual([2, 4]);
    expect(extractShogiMetadata('24銀')!.dest).toEqual([2, 4]);
    expect(extractShogiMetadata('二三銀')!.dest).toEqual([2, 3]);
    expect(extractShogiMetadata('同銀')!.dest).toEqual(undefined);
    expect(extractShogiMetadata('仝銀')!.dest).toEqual(undefined);
  });
  it('parses the piece', () => {
    expect(extractShogiMetadata('８三歩')!.piece).toEqual('p');
    expect(extractShogiMetadata('８三香')!.piece).toEqual('l');
    expect(extractShogiMetadata('８三桂')!.piece).toEqual('n');
    expect(extractShogiMetadata('８三銀')!.piece).toEqual('s');
    expect(extractShogiMetadata('８三角')!.piece).toEqual('b');
    expect(extractShogiMetadata('８三飛')!.piece).toEqual('r');
    expect(extractShogiMetadata('８三金')!.piece).toEqual('g');
    expect(extractShogiMetadata('８三と')!.piece).toEqual('pro_p');
    expect(extractShogiMetadata('８三成香')!.piece).toEqual('pro_l');
    expect(extractShogiMetadata('８三成桂')!.piece).toEqual('pro_n');
    expect(extractShogiMetadata('８三成銀')!.piece).toEqual('pro_s');
    expect(extractShogiMetadata('８三馬')!.piece).toEqual('pro_b');
    expect(extractShogiMetadata('８三龍')!.piece).toEqual('pro_r');
    expect(extractShogiMetadata('８三竜')!.piece).toEqual('pro_r');
    expect(extractShogiMetadata('８三玉')!.piece).toEqual('k');
    expect(extractShogiMetadata('８三王')!.piece).toEqual('k');
  });
  it('parses the movement', () => {
    expect(extractShogiMetadata('８三銀打')!.movement).toEqual('drop');
    expect(extractShogiMetadata('８三銀引')!.movement).toEqual('down');
    expect(extractShogiMetadata('８三銀寄')!.movement).toEqual('horiz');
    expect(extractShogiMetadata('８三銀上')!.movement).toEqual('up');
    expect(extractShogiMetadata('８三銀行')!.movement).toEqual('up');
    expect(extractShogiMetadata('８三銀入')!.movement).toEqual('up');
    expect(extractShogiMetadata('８三銀右')!.movement).toEqual('right');
    expect(extractShogiMetadata('８三銀左')!.movement).toEqual('left');
    expect(extractShogiMetadata('８三銀直')!.movement).toEqual('vert');
  });
  it('parses the promotion', () => {
    expect(extractShogiMetadata('８三銀直')!.promotion).toStrictEqual(
      undefined
    );
    expect(extractShogiMetadata('８三銀直成')!.promotion).toStrictEqual(true);
    expect(extractShogiMetadata('８三銀直生')!.promotion).toStrictEqual(true);
    expect(extractShogiMetadata('８三銀直不成')!.promotion).toStrictEqual(
      false
    );
  });
});
