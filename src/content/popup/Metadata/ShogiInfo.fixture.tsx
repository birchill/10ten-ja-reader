import { ShogiMeta } from '../../shogi';

import { ShogiInfo } from './ShogiInfo';

const TEST_DATA: Array<[string, { meta: ShogiMeta }]> = [
  [
    '☗８三銀引成',
    {
      meta: {
        type: 'shogi',
        matchLen: 6,
        side: 'black',
        dest: [8, 3],
        piece: 's',
        movement: 'down',
        promotion: true,
      },
    },
  ],
  [
    '８三銀引成',
    {
      meta: {
        type: 'shogi',
        matchLen: 5,
        dest: [8, 3],
        piece: 's',
        movement: 'down',
        promotion: true,
      },
    },
  ],
  [
    '☖２四同',
    {
      meta: {
        type: 'shogi',
        matchLen: 5,
        side: 'white',
        dest: [2, 4, 1],
        piece: 'p',
      },
    },
  ],
];

export default Object.fromEntries(
  TEST_DATA.map((entry) => [
    entry[0],
    <ShogiInfo {...entry[1]} key={entry[0]} />,
  ])
);
