import { WordResult } from '@birchill/jpdict-idb';
import { useFixtureInput, useFixtureSelect } from 'react-cosmos/client';

import {
  AccentDisplay,
  PartOfSpeechDisplay,
} from '../../../common/content-config-params';

import { WordTable } from './WordTable';

const namePreviewData = {
  names: [
    {
      id: 5414133,
      k: ['真楯'],
      r: ['またて'],
      tr: [{ det: ['Matate'], type: ['given'] }],
      matchLen: 3,
    },
    {
      id: 5589142,
      k: ['馬立'],
      r: ['またて'],
      tr: [{ det: ['Matate'], type: ['place', 'surname'] }],
      matchLen: 3,
    },
  ],
  more: true,
};

const entry_data: Array<[string, Array<WordResult>]> = [
  [
    'default',
    [
      {
        id: 1463770,
        k: [
          {
            ent: '日',
            p: ['i1', 'n1', 'nf03'],
            match: true,
            wk: 2,
            bv: { l: 4 },
            matchRange: [0, 1],
          },
        ],
        r: [{ ent: 'ひ', p: ['i1', 'n1', 'nf03'], a: 0, match: true }],
        s: [
          { g: [{ str: 'day' }, { str: 'days' }], pos: ['n'], match: true },
          {
            g: [{ str: 'sun' }, { str: 'sunshine' }, { str: 'sunlight' }],
            pos: ['n'],
            match: true,
          },
          {
            g: [{ str: 'case (esp. unfortunate)' }, { str: 'event' }],
            pos: ['n'],
            inf: 'as 〜した日には, 〜と来た日には, etc.',
            match: true,
          },
          { g: [{ str: 'Sonne' }], lang: 'de', match: true },

          { g: [{ str: 'Tag' }], lang: 'de', match: true },
          {
            g: [
              { str: 'explanation', type: 'expl' },
              { str: 'literally', type: 'lit' },
              { str: 'figurative', type: 'fig' },
              { str: 'trademark', type: 'tm' },
            ],
            pos: ['n-suf'],
            misc: ['uk'],
            match: true,
          },
        ],
      },
      {
        id: 2083100,
        k: [{ ent: '日', p: ['s1'], match: true, matchRange: [0, 1] }],
        r: [{ ent: 'にち', p: ['s1'], a: 1, match: true }],
        s: [
          {
            g: [{ str: 'Sunday' }],
            pos: ['n'],
            xref: [{ k: '日曜' }],
            misc: ['abbr'],
            match: true,
          },
          { g: [{ str: 'nth day (of the month)' }], pos: ['suf'], match: true },
          { g: [{ str: 'counter for days' }], pos: ['ctr'], match: true },
          {
            g: [{ str: 'Japan' }],
            pos: ['n'],
            xref: [{ k: '日本' }],
            misc: ['abbr'],
            match: true,
          },
        ],
      },
      {
        id: 1461140,
        k: [
          {
            ent: '二',
            p: ['i1', 'n1', 'nf01'],
            match: true,
            wk: 1,
            matchRange: [0, 1],
          },
          { ent: '２', match: false },
          { ent: '弐', match: false },
          { ent: '弍', match: false },
          { ent: '貳', i: ['oK'], match: false },
          { ent: '貮', i: ['oK'], match: false },
        ],
        r: [
          {
            ent: 'に',
            p: ['i1', 'n1', 'nf01'],
            a: 1,
            match: true,
            bg: { l: 5 },
          },
          { ent: 'ふた', a: 2, match: true },
          { ent: 'ふ', a: 1, match: true },
          { ent: 'ふう', a: 1, match: true },
        ],
        s: [
          {
            g: [{ str: 'two' }, { str: '2' }],
            pos: ['num'],
            inf: 'ふ and ふう used mainly when counting aloud; 弐, 貳 and 貮 are used in legal documents',
            match: true,
          },
        ],
      },
      {
        id: 2728160,
        k: [{ ent: '二', match: true, matchRange: [0, 1] }],
        r: [
          { ent: 'アル', a: 1, match: true },
          { ent: 'アール', i: ['ik'], a: 1, match: true },
        ],
        s: [
          {
            g: [{ str: 'two' }],
            pos: ['num'],
            lsrc: [{ lang: 'zh', src: 'èr' }],
            match: true,
          },
          {
            g: [{ str: 'wasei test' }],
            pos: ['num'],
            lsrc: [{ lang: 'en', src: 'wasei test', wasei: true }],
            match: true,
          },
        ],
      },
    ],
  ],
  [
    'search only match',
    [
      {
        id: 1595900,
        k: [
          { ent: '磨りガラス', match: false },
          { ent: '擦りガラス', match: false },
          { ent: '磨り硝子', i: ['sK'], match: false },
          { ent: '磨硝子', i: ['sK'], match: false },
          { ent: '擦り硝子', i: ['sK'], match: false },
          { ent: '磨ガラス', i: ['sK'], match: true, matchRange: [0, 4] },
          { ent: '擦硝子', i: ['sK'], match: false },
          { ent: '擦ガラス', i: ['sK'], match: false },
          { ent: '摺りガラス', i: ['sK'], match: false },
          { ent: '摺ガラス', i: ['sK'], match: false },
          { ent: '摺硝子', i: ['sK'], match: false },
          { ent: '摺り硝子', i: ['sK'], match: false },
        ],
        r: [{ ent: 'すりガラス', a: 3, match: true }],
        s: [
          {
            g: [{ str: 'ground glass' }, { str: 'frosted glass' }],
            pos: ['n'],
            misc: ['uk'],
            match: true,
          },
        ],
      },
    ],
  ],
];

export default Object.fromEntries(
  entry_data.map((entry) => [
    entry[0],
    () => {
      const [accentDisplay] = useFixtureSelect<AccentDisplay>('accentDisplay', {
        options: ['binary', 'downstep', 'binary-hi-contrast', 'none'],
      });
      const [bunproDisplay] = useFixtureInput('bunproDisplay', true);
      const [posDisplay] = useFixtureSelect<PartOfSpeechDisplay>('posDisplay', {
        options: ['expl', 'code', 'none'],
      });
      const [readingOnly] = useFixtureInput('readingOnly', false);
      const [showPriority] = useFixtureInput('showPriority', true);
      const [waniKaniVocabDisplay] = useFixtureSelect('waniKanjiVocabDisplay', {
        options: ['show-matches', 'hide'],
      });

      const [title] = useFixtureInput('title', false);
      const [namePreview] = useFixtureInput('namePreview', false);
      const [more] = useFixtureInput('more', false);

      return (
        <WordTable
          key={entry[0]}
          entries={entry[1]}
          matchLen={0}
          more={more}
          title={title ? 'This is a test title' : undefined}
          namePreview={namePreview ? namePreviewData : undefined}
          config={{
            dictLang: 'de',
            fx: {
              currency: 'USD',
              rate: 0.006737498565405526,
              timestamp: 1743634684000,
            },
            preferredUnits: 'metric',
            accentDisplay,
            bunproDisplay,
            posDisplay,
            readingOnly,
            showPriority,
            waniKaniVocabDisplay,
          }}
          copyState={{ kind: 'inactive' }}
        />
      );
    },
  ])
);
