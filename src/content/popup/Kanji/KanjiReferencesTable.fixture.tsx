import type { ReferenceAbbreviation } from '../../../common/refs';

import { KanjiReferencesTable } from './KanjiReferencesTable';

const TEST_ENTRY = {
  c: '日',
  r: {
    py: ['ri4'],
    on: ['ニチ', 'ジツ'],
    kun: ['ひ', '-び', '-か'],
    na: [
      'あ',
      'あき',
      'いる',
      'く',
      'くさ',
      'こう',
      'す',
      'たち',
      'に',
      'にっ',
      'につ',
      'へ',
    ],
  },
  m: ['day', 'sun', 'Japan', 'counter for days'],
  rad: {
    x: {
      r: 72,
      c: '⽇',
      na: ['ひ'],
      m: ['day', 'sun', 'Japan', 'counter for days'],
      m_lang: 'en',
    },
  },
  refs: {
    nelson_c: 2097,
    nelson_n: 2410,
    halpern_njecd: 3027,
    halpern_kkld_2ed: 2606,
    heisig6: 12,
    henshall: 62,
    sh_kk2: 5,
    kanji_in_context: 16,
    busy_people: '1.A',
    kodansha_compact: 963,
    skip: '3-3-1',
    sh_desc: '4c0.1',
    conning: 1,
  },
  misc: { sc: 4, gr: 1, freq: 1, jlpt: 4, kk: 10, wk: 2, jlptn: 5 },
  m_lang: 'en',
  comp: [],
  cf: [],
};

const LONG_MORO_ENTRY = {
  c: '調',
  r: {
    py: ['diao4', 'tiao2'],
    on: ['チョウ'],
    kun: ['しら.べる', 'しら.べ', 'ととの.う', 'ととの.える'],
    na: ['ぎ', 'つぎ'],
  },
  m: [
    'tune',
    'tone',
    'meter',
    'key (music)',
    'writing style',
    'prepare',
    'exorcise',
    'investigate',
    'harmonize',
    'mediate',
  ],
  rad: {
    x: {
      r: 149,
      c: '⾔',
      na: ['げん', 'ことば'],
      m: ['say', 'word'],
      m_lang: 'en',
    },
  },
  refs: {
    nelson_c: 4392,
    nelson_n: 5647,
    halpern_njecd: 1567,
    halpern_kkd: 1973,
    halpern_kkld_2ed: 1417,
    heisig6: 373,
    moro: '35609P.10.505',
    henshall: 348,
    sh_kk2: 342,
    kanji_in_context: 210,
    busy_people: '3.9',
    kodansha_compact: 1699,
    skip: '1-7-8',
    sh_desc: '7a8.16',
    conning: 306,
  },
  misc: { sc: 15, gr: 3, freq: 87, jlpt: 2, kk: 8, wk: 10, jlptn: 3 },
  st: 'M23.1 15.6c2.4 1.4 6.3 6 6.9 8.1M11.1 33c1.5.6 3.7.3 5.3.2 6.5-.5 13.9-1.3 19.5-2.3 1.7-.4 3.9-.5 5.5-.2M17.2 46.8c1.1.4 2.6.2 3.7 0 4-.3 9.2-1.4 12.5-2q1.8-.4 3.8 0M17.5 59.3c1 .4 2.7.2 3.9 0 3.3-.2 9.2-1.1 12-1.8q2-.4 4.1 0M16.6 72.2c.8.7 1.3 2 1.4 2.8.7 3.5 1.3 8.4 2 13.1l.5 3.7M18.3 73.1q9.4-1.4 18.2-3c1.5-.2 2.6 1.3 2.4 2.3l-3.2 13.8M21.2 89c4.1-.4 8-1 13.2-1.7l2.8-.3M50.4 21.1q1.2 1.2 1.4 3.5c.7 38.5-1.8 55.7-12.3 68.7M52.6 22.9c6-.9 28.5-3.6 35-4.5 4.3-.5 5.7.9 5.7 4.6l.2 67.7c0 11.2-5 4.8-8.3 1.4M60 39c.9.4 2.6.4 3.6.3 3-.3 13.3-2.2 17.2-2.4q2.3 0 3.3.2M70.7 26.4c.7.3 1.1 1.6 1.3 2.4s0 17.5-.2 22.3M57.3 52.8q2 .7 4.6.3c6.5-.8 15.6-2.5 21.2-2.8q2-.2 4.1 0M60.3 61.8q1.5 1 2 3A196 196 0 0 1 65 79.1M62.3 62.8c6.1-1.3 13.1-2.3 17-2.8 2.4-.3 3.5 1.1 3.2 2.9-.6 3.6-1.3 6.5-2.7 11.8M65.3 77a203 203 0 0 1 16.2-1.5',
  comp: [
    {
      c: '訁',
      k: '言',
      na: ['ごんべん'],
      m: ['say', 'word'],
      m_lang: 'en',
      base: {
        c: '⾔',
        k: '言',
        na: ['げん', 'ことば'],
        m: ['say', 'word'],
        m_lang: 'en',
      },
      is_rad: true,
    },
    {
      c: '⼌',
      k: '冂',
      na: ['けいがまえ', 'まきがまえ'],
      m: ['upside down box'],
      m_lang: 'en',
    },
    { c: '⼝', k: '口', na: ['くち'], m: ['mouth'], m_lang: 'en' },
    {
      c: '⼟',
      k: '土',
      na: ['つち'],
      m: ['soil', 'earth', 'ground', 'Turkey'],
      m_lang: 'en',
    },
  ],
  m_lang: 'en',
  cf: [],
};

const longMoroReferences = [
  'radical',
  'nelson_r',
  'kk',
  'py',
  'jlpt',
  'unicode',
  'conning',
  'halpern_njecd',
  'halpern_kkld_2ed',
  'heisig6',
  'henshall',
  'sh_kk2',
  'moro',
  'nelson_c',
  'nelson_n',
  'skip',
  'sh_desc',
] as const;

function ReferencesVariant({
  title,
  references,
}: {
  title: string;
  references: Array<ReferenceAbbreviation>;
}) {
  return (
    <div>
      <h2>{title}</h2>
      <KanjiReferencesTable entry={TEST_ENTRY} kanjiReferences={references} />
    </div>
  );
}

export default {
  default: (
    <div
      style={{
        background: 'var(--bg-color)',
        color: 'var(--text-color)',
        padding: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '40px',
      }}
    >
      <ReferencesVariant
        title="Even number of rows (last row filled)"
        references={[
          'radical',
          'nelson_r',
          'kk',
          'py',
          'jlpt',
          'unicode',
          'conning',
          'halpern_njecd',
          'halpern_kkld_2ed',
          'heisig6',
          'henshall',
          'sh_kk2',
          'nelson_c',
        ]}
      />

      <ReferencesVariant
        title="Even number of rows (last row not filled)"
        references={[
          'radical',
          'nelson_r',
          'kk',
          'py',
          'jlpt',
          'unicode',
          'conning',
          'halpern_njecd',
          'halpern_kkld_2ed',
          'heisig6',
          'henshall',
          'sh_kk2',
        ]}
      />

      <ReferencesVariant
        title="Odd number of rows (last row filled)"
        references={[
          'radical',
          'nelson_r',
          'kk',
          'py',
          'jlpt',
          'unicode',
          'conning',
          'halpern_njecd',
          'halpern_kkld_2ed',
          'heisig6',
          'henshall',
          'sh_kk2',
          'nelson_c',
          'nelson_n',
          'skip',
        ]}
      />

      <ReferencesVariant
        title="Odd number of rows (last row not filled)"
        references={[
          'radical',
          'nelson_r',
          'kk',
          'py',
          'jlpt',
          'unicode',
          'conning',
          'halpern_njecd',
          'halpern_kkld_2ed',
          'heisig6',
          'henshall',
          'sh_kk2',
          'nelson_c',
          'nelson_n',
        ]}
      />
    </div>
  ),
  'WaniKani links': (
    <div
      style={{
        background: 'var(--bg-color)',
        color: 'var(--text-color)',
        padding: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '40px',
      }}
    >
      <ReferencesVariant
        title="Highlighted row"
        references={['unicode', 'wk']}
      />
      <ReferencesVariant
        title="Un-highlighted row"
        references={['conning', 'henshall', 'unicode', 'wk']}
      />
    </div>
  ),
  'Long moro entry': (
    <div
      style={{
        background: 'var(--bg-color)',
        color: 'var(--text-color)',
        padding: '18px',
        width: 'min(500px,100vw - 30px)',
      }}
    >
      <KanjiReferencesTable
        entry={LONG_MORO_ENTRY}
        kanjiReferences={longMoroReferences}
      />
    </div>
  ),
};
