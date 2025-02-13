import { KanjiEntry } from './KanjiEntry';

export default {
  default: (
    <KanjiEntry
      index={0}
      entry={{
        c: '士',
        r: { on: ['シ'], kun: ['さむらい'], na: ['お', 'ま'] },
        m: ['gentleman', 'scholar', 'samurai', 'samurai radical (no. 33)'],
        rad: {
          x: 33,
          b: '⼠',
          k: '士',
          na: ['さむらい'],
          m: ['gentleman', 'scholar', 'samurai'],
          m_lang: 'en',
        },
        refs: {
          nelson_c: 1160,
          nelson_n: 1117,
          halpern_njecd: 3405,
          halpern_kkld: 2129,
          halpern_kkld_2ed: 2877,
          heisig: 319,
          heisig6: 341,
          henshall: 494,
          sh_kk: 572,
          sh_kk2: 581,
          kanji_in_context: 755,
          kodansha_compact: 393,
          skip: '4-3-2',
          sh_desc: '3p0.1',
          conning: 350,
        },
        misc: { sc: 3, gr: 4, freq: 526, jlpt: 1, kk: 7 },
        m_lang: 'en',
        comp: [],
        cf: [],
        st: 'M13.13 54.98c3.87.9 7.66.43 11.36.16 18.76-1.39 44.96-3.08 61.9-3.32 3.22-.05 6.57.08 9.74.76M52.25 17.25A6.12 6.12 0 0 1 54 21.5c0 1.03.25 58.62.25 66M21.75 89.45c2.73.83 5.82.54 8.62.42 12.73-.57 33.94-2.04 45.88-2.17 2.97-.03 5.83.21 8.75.74',
      }}
      kanjiReferences={['radical', 'nelson_r', 'kk', 'unicode', 'henshall']}
      selectState="unselected"
    />
  ),
  wide: (
    <KanjiEntry
      index={0}
      entry={{
        c: '和',
        r: {
          py: ['he2', 'he4', 'huo2', 'huo4', 'huo5', 'hai1', 'he5'],
          on: ['ワ', 'オ', 'カ'],
          kun: ['やわ.らぐ', 'やわ.らげる', 'なご.む', 'なご.やか', 'あ.える'],
          na: [
            'あい',
            'いず',
            'かず',
            'かつ',
            'かつり',
            'かづ',
            'たけ',
            'ち',
            'とも',
            'な',
            'にぎ',
            'まさ',
            'やす',
            'よし',
            'より',
            'わだこ',
            'わっ',
          ],
        },
        m: ['harmony', 'Japanese style', 'peace', 'soften', 'Japan'],
        rad: {
          x: 30,
          b: '⼝',
          k: '口',
          na: ['くち'],
          m: ['mouth'],
          m_lang: 'en',
          nelson: 115,
        },
        refs: {
          nelson_c: 3268,
          nelson_n: 770,
          halpern_njecd: 1130,
          halpern_kkld_2ed: 1044,
          heisig6: 963,
          henshall: 416,
          sh_kk2: 124,
          kanji_in_context: 352,
          busy_people: '3.5',
          kodansha_compact: 326,
          skip: '1-5-3',
          sh_desc: '5d3.1',
          conning: 236,
        },
        misc: { sc: 8, gr: 3, freq: 124, jlpt: 2, kk: 8 },
        comp: [
          { c: '⼝', na: ['くち'], m: ['mouth'], m_lang: 'en' },
          {
            c: '⽲',
            na: ['のぎ'],
            m: ['two branch tree', 'grain'],
            m_lang: 'en',
          },
        ],
        m_lang: 'en',
        cf: [],
        st: 'M48.62 15.5c.03.72-.29 1.64-1.04 2.34-3.33 3.12-13.46 7.99-26.82 11.41M12.94 45.38c2.31.62 5.12.6 7.56.27 8.62-1.15 19.25-3.15 28.62-4.27 1.65-.2 4.24-.12 5.88.33M37.39 27.2c.96.96 1.51 1.93 1.51 2.8 0 2.94 0 43.09-.07 58.99-.02 3.01-.03 5.15-.05 6.01M38.03 44.02c0 1.23-.26 2.66-.54 3.39C32.81 59.33 22.96 74.12 14 80.31M41.14 53.81c4.38 1.75 9.87 7.12 11.8 10.63M60 47.19c.97.97 1.52 2.14 1.76 3.43 1.26 6.69 2.17 15.52 3.12 23.48.17 1.41.33 2.8.49 4.14M62.44 48.81c11.87-1.69 21.33-2.94 27.06-3.67 2.81-.36 4.46.83 3.89 3.77-1.2 6.23-3.01 15.28-4.71 23.5M65.6 75.56c9.62-1.12 16.1-1.83 22.04-2.37 1.03-.09 2.04-.18 3.07-.26',
      }}
      kanjiReferences={[
        'radical',
        'nelson_r',
        'kk',
        'unicode',
        'henshall',
        'py',
      ]}
      selectState="unselected"
    />
  ),
  'meta tags': (
    <KanjiEntry
      index={0}
      entry={{
        c: '蟐',
        r: { kun: ['もみ'], on: ['ジョウ'] },
        m: ['toad', 'mantis'],
        rad: {
          x: 142,
          b: '⾍',
          k: '虫',
          na: ['むし'],
          m: ['insect', 'bug', 'temper'],
          m_lang: 'en',
        },
        refs: { skip: '1-6-11', sh_desc: '6d11.4', nelson_n: 5374 },
        misc: { sc: 17, meta: ['phantom kanji', 'kokuji'] },
        comp: [
          {
            c: '⼍',
            na: ['わかんむり'],
            m: ['crown shaped wa'],
            m_lang: 'en',
            k: '冖',
          },
          { c: '⼝', na: ['くち'], m: ['mouth'], m_lang: 'en', k: '口' },
          {
            c: '⼱',
            na: ['はば'],
            m: ['towel', 'hanging scroll', 'width'],
            m_lang: 'en',
            k: '巾',
          },
          {
            c: '⾍',
            na: ['むし'],
            m: ['insect', 'bug', 'temper'],
            m_lang: 'en',
            k: '虫',
          },
          {
            c: '⺌',
            na: ['しょうがしら', 'しょうかんむり', 'しょう', 'なおがしら'],
            m: ['little', 'small'],
            m_lang: 'en',
            k: '小',
          },
        ],
        m_lang: 'en',
        cf: [],
        st: 'M11.76 32.64c.39.57.87 1.56.96 2.3.74 6.45 2.1 14.82 3.17 24.45M12.94 33.96c5.94-1.08 18.5-2.27 22.79-2.69 1.67-.16 2.45 1.54 2.24 3.16-.71 5.55-1.69 11.97-2.85 21.2M16.11 57.21c6.64-.46 13.14-1.21 21.05-1.78M22.92 12.75c1.08 1 2.26 2.75 2.26 4.47 0 4.78-.2 46.78-.2 60.16M13.57 82.27c1.18.98 3.46.61 4.06.32s15.54-7.65 19.26-9.97M33 65.25c2.49 2.85 6.43 11.71 7.06 16.14M66.99 11.87c.1.24 1.37 1.23 1.47 2.73.47 7.21.29 12.38.29 14.84M49.38 16.08c3.01 1.77 7.77 7.27 8.52 10.02M87.45 15.09c.02.25.04.65-.04 1.01-.51 2.13-3.42 6.8-7.41 9.66M46.72 30.73c-.12 3.37-2.21 11.28-3.24 13.29M48.12 32.14c6.19-1.08 31.23-2.71 43.66-3.54 7.64-.51.68 7.25-.49 8.4M53.59 41.58c.25.19.54.34.62.59.72 2.18 2.09 11.62 2.81 14.82M55.16 42.85c4.65-.46 22.85-2.6 27.14-3.07 1.08-.11 2.84 1.57 2.38 2.9-.75 2.17-2.25 6.98-3.52 9.92M57.55 54.95c6.02-.63 19.37-1.74 25.61-2.08M49.92 66.45c.33 1.02 1.13 2.6 1.22 3.29.1.7.31 17.05.22 21.39M52.07 67.96c2.87-.23 32.01-3.27 34.15-3.41 2.52-.17 3.97 1.45 3.97 3.91 0 4.08.12 13.11-.58 16.54-1.09 5.33-4.78 1.24-5.99-.6M67.97 56.45c.41.29 1.36 2.2 1.36 2.8 0 6.76-.05 37.56-.13 41.25',
      }}
      kanjiReferences={['radical', 'nelson_r', 'kk', 'unicode', 'henshall']}
      selectState="unselected"
    />
  ),
  'with animation': (
    <KanjiEntry
      index={0}
      entry={{
        c: '蒸',
        r: {
          py: ['zheng1'],
          on: ['ジョウ', 'セイ'],
          kun: ['む.す', 'む.れる', 'む.らす'],
        },
        m: ['steam', 'heat', 'sultry', 'foment', 'get musty'],
        rad: {
          x: 140,
          b: '⺾',
          k: '艹',
          na: ['くさかんむり'],
          m: ['grass'],
          m_lang: 'en',
          base: { b: '⾋', k: '艸', na: ['くさ'], m: ['grass'], m_lang: 'en' },
        },
        refs: {
          nelson_c: 4002,
          nelson_n: 5163,
          halpern_njecd: 2334,
          halpern_kkld_2ed: 2043,
          heisig6: 2049,
          henshall: 904,
          sh_kk2: 973,
          kanji_in_context: 802,
          kodansha_compact: 665,
          skip: '2-3-10',
          sh_desc: '3k9.19',
          conning: 960,
        },
        misc: { sc: 13, gr: 6, freq: 1552, jlpt: 2, kk: 5, wk: 33, jlptn: 2 },
        comp: [
          {
            c: '⺾',
            na: ['くさかんむり'],
            m: ['grass'],
            m_lang: 'en',
            k: '艸',
          },
          { c: '了', na: ['リョウ'], m: ['complete', 'finish'], m_lang: 'en' },
          { c: '⽔', na: ['みず'], m: ['water'], m_lang: 'en', k: '水' },
          { c: '⼀', na: ['いち'], m: ['one'], m_lang: 'en', k: '一' },
          {
            c: '⺣',
            na: ['れっか', 'れんが'],
            m: ['fire'],
            m_lang: 'en',
            k: '火',
          },
        ],
        m_lang: 'en',
        cf: [],
        st: 'M23.6 23.07c2.65.56 5.52.37 7.89.15 12.44-1.2 35.91-2.97 48.76-3.37 2.63-.08 5.59.02 8.15.64M40.33 12.5c.77.77 1.55 1.86 1.67 2.63 1.25 8.49 1.82 13.52 2.25 16.12M71.09 10.5c.33.92.51 2.11.14 3.24C69.08 20.4 68.35 22.73 66 29M36.72 37.38c1.66.87 4.34.8 6.16.54 5.88-.83 17.99-2.55 21.65-3.13 1.65-.26 2.99 1.73 1.17 3.1-4.61 3.46-7.2 5.65-12.61 9.35M51.09 47.16c5.66 2.84 7.66 12.09 3.82 21.85-1.62 4.1-4.78.12-6.09-1.62M22.38 54.34c1.6.18 2.95.32 4.55-.05 2.32-.29 11.9-3.18 13.92-3.92s3.92 1.15 2.56 3.15c-4.91 7.23-15.28 17.1-26.07 21.72M83.02 40.95c-.02.8-.18 1.9-.75 2.43-3.89 3.62-7.89 6.37-14.73 9.71M62.3 53.29c2.43.37 14.8 10.52 22.7 15.58 1.39.89 4.62 2.75 6.62 3.65M31.9 79.04c2.6.46 5.08.3 7.47.08 8.93-.83 20.59-2.68 30.25-2.94 2.11-.06 4.23-.09 6.31.3M23.08 85.68c0 4.91-6.61 12.16-8.33 13.57M39.13 85.87c2.65 2.33 5.16 8.75 5.82 12.38M58.18 85.55c3.06 2.26 7.89 9.3 8.66 12.82M80.42 84.52c3.94 2.59 10.17 10.66 11.16 14.7',
      }}
      kanjiReferences={['radical', 'nelson_r', 'kk', 'unicode', 'henshall']}
      selectState="unselected"
    />
  ),
  'without animation': (
    <KanjiEntry
      index={0}
      entry={{
        c: '蒸',
        r: {
          py: ['zheng1'],
          on: ['ジョウ', 'セイ'],
          kun: ['む.す', 'む.れる', 'む.らす'],
        },
        m: ['steam', 'heat', 'sultry', 'foment', 'get musty'],
        rad: {
          x: 140,
          b: '⺾',
          k: '艹',
          na: ['くさかんむり'],
          m: ['grass'],
          m_lang: 'en',
          base: { b: '⾋', k: '艸', na: ['くさ'], m: ['grass'], m_lang: 'en' },
        },
        refs: {
          nelson_c: 4002,
          nelson_n: 5163,
          halpern_njecd: 2334,
          halpern_kkld_2ed: 2043,
          heisig6: 2049,
          henshall: 904,
          sh_kk2: 973,
          kanji_in_context: 802,
          kodansha_compact: 665,
          skip: '2-3-10',
          sh_desc: '3k9.19',
          conning: 960,
        },
        misc: { sc: 13, gr: 6, freq: 1552, jlpt: 2, kk: 5, wk: 33, jlptn: 2 },
        comp: [
          {
            c: '⺾',
            na: ['くさかんむり'],
            m: ['grass'],
            m_lang: 'en',
            k: '艸',
          },
          { c: '了', na: ['リョウ'], m: ['complete', 'finish'], m_lang: 'en' },
          { c: '⽔', na: ['みず'], m: ['water'], m_lang: 'en', k: '水' },
          { c: '⼀', na: ['いち'], m: ['one'], m_lang: 'en', k: '一' },
          {
            c: '⺣',
            na: ['れっか', 'れんが'],
            m: ['fire'],
            m_lang: 'en',
            k: '火',
          },
        ],
        m_lang: 'en',
        cf: [],
      }}
      kanjiReferences={['radical', 'nelson_r', 'kk', 'unicode', 'henshall']}
      selectState="unselected"
    />
  ),
};
