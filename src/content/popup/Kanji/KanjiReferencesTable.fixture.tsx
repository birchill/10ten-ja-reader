import { ReferenceAbbreviation } from '../../../common/refs';

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
    x: 72,
    b: '⽇',
    k: '日',
    na: ['ひ'],
    m: ['day', 'sun', 'Japan', 'counter for days'],
    m_lang: 'en',
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
};
