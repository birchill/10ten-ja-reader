import { WordResult } from '@birchill/jpdict-idb';
import { useFixtureInput, useFixtureSelect } from 'react-cosmos/client';

import {
  AccentDisplay,
  PartOfSpeechDisplay,
} from '../../../common/content-config-params';

import { ShowPopupOptions } from '../show-popup';

import { WordTable } from './WordTable';

const options: Omit<
  ShowPopupOptions,
  | 'accentDisplay'
  | 'bunproDisplay'
  | 'posDisplay'
  | 'showDefinitions'
  | 'showPriority'
  | 'waniKaniVocabDisplay'
> = {
  allowOverlap: false,
  closeShortcuts: ['Esc'],
  copy: {
    includeAllSenses: true,
    includePartOfSpeech: true,
    includeLessCommonHeadwords: true,
  },
  copyNextKey: 'c',
  copyState: { kind: 'inactive' },
  dictLang: 'de',
  dictToShow: 'words',
  displayMode: 'hover',
  fontFace: 'bundled',
  fontSize: 'normal',
  fxData: {
    currency: 'USD',
    rate: 0.006737498565405526,
    timestamp: 1743634684000,
  },
  expandShortcuts: ['x'],
  interactive: true,
  isExpanded: false,
  isVerticalText: false,
  kanjiReferences: [],
  pinShortcuts: ['Ctrl'],
  pointerType: 'cursor',
  popupStyle: 'default',
  positionMode: 1,
  preferredUnits: 'metric',
  previousHeight: 168,
  safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
  showKanjiComponents: true,
  switchDictionaryKeys: ['Shift', 'Enter'],
  tabDisplay: 'top',
  getCursorClearanceAndPos: () => {
    return { cursorClearance: { top: 0, bottom: 0, left: 0, right: 0 } };
  },
};

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

const entries: Array<WordResult> = [
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
        g: [{ str: 'test with a second pos' }],
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
      { ent: 'に', p: ['i1', 'n1', 'nf01'], a: 1, match: true, bg: { l: 5 } },
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
];

export default function WordTableFixture() {
  const [accentDisplay] = useFixtureSelect<AccentDisplay>('accentDisplay', {
    options: ['binary', 'downstep', 'binary-hi-contrast', 'none'],
  });
  const [bunproDisplay] = useFixtureInput('bunproDisplay', true);
  const [posDisplay] = useFixtureSelect<PartOfSpeechDisplay>('posDisplay', {
    options: ['expl', 'code', 'none'],
  });
  const [showDefinitions] = useFixtureInput('showDefinitions', true);
  const [showPriority] = useFixtureInput('showPriority', true);
  const [waniKaniVocabDisplay] = useFixtureSelect('waniKanjiVocabDisplay', {
    options: ['show-matches', 'hide'],
  });

  const [title] = useFixtureInput('title', false);
  const [namePreview] = useFixtureInput('namePreview', false);
  const [more] = useFixtureInput('more', false);

  return (
    <WordTable
      entries={entries}
      matchLen={0}
      more={more}
      title={title ? 'This is a test title' : undefined}
      namePreview={namePreview ? namePreviewData : undefined}
      options={{
        ...options,
        accentDisplay,
        bunproDisplay,
        posDisplay,
        showDefinitions,
        showPriority,
        waniKaniVocabDisplay,
      }}
    />
  );
}
