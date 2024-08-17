import { KanjiEntry } from './KanjiEntry';

export default {
  default: (
    <KanjiEntry
      index={0}
      entry={{
        c: '士',
        r: {
          on: ['シ'],
          kun: ['さむらい'],
          na: ['お', 'ま'],
        },
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
        misc: {
          sc: 3,
          gr: 4,
          freq: 526,
          jlpt: 1,
          kk: 7,
        },
        m_lang: 'en',
        comp: [],
        cf: [],
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
        misc: {
          sc: 8,
          gr: 3,
          freq: 124,
          jlpt: 2,
          kk: 8,
        },
        comp: [
          {
            c: '⼝',
            na: ['くち'],
            m: ['mouth'],
            m_lang: 'en',
          },
          {
            c: '⽲',
            na: ['のぎ'],
            m: ['two branch tree', 'grain'],
            m_lang: 'en',
          },
        ],
        m_lang: 'en',
        cf: [],
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
      }}
      kanjiReferences={['radical', 'nelson_r', 'kk', 'unicode', 'henshall']}
      selectState="unselected"
    />
  ),
};
