import type { NameResult } from '../../../background/search-result';

import { NameEntry } from './NameEntry';

const TEST_ENTRIES: Array<[string, NameResult]> = [
  [
    'default',
    {
      id: 5664396,
      k: ['明里'],
      r: ['あかり'],
      tr: [{ det: ['Akari'], type: ['place', 'surname', 'fem', 'masc'] }],
      matchLen: 2,
    },
  ],
  [
    'with age',
    {
      id: 5212847,
      k: ['久石譲'],
      r: ['ひさいしじょう'],
      tr: [{ det: ['Hisaishi Jō (1950.12-)'], type: ['person'] }],
      matchLen: 3,
    },
  ],
  [
    'multiple kanji entries',
    {
      id: 5000097,
      r: ['あいこ'],
      tr: [{ det: ['Aiko'], type: ['fem'] }],
      matchLen: 3,
      k: [
        'あい子',
        'あ以子',
        'あ衣子',
        '亜以子',
        '亜伊呼',
        '亜伊子',
        '亜依子',
        '亜惟子',
        '亜維子',
        '亜緯子',
        '亜衣古',
        '亜衣子',
        '亜子',
        '亜唯子',
        '娃湖',
        '娃子',
      ],
    },
  ],
];

export default Object.fromEntries(
  TEST_ENTRIES.map((entry) => [
    entry[0],
    <NameEntry entry={entry[1]} selectState="unselected" key={entry[0]} />,
  ])
);
