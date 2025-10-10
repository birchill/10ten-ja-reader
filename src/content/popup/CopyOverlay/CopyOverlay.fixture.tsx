import type { QueryResult } from '../../query';

import { CopyOverlay } from './CopyOverlay';

const KOTOBA: QueryResult = {
  words: {
    type: 'words',
    data: [
      {
        id: 1264540,
        k: [
          {
            ent: '言葉',
            p: ['i1', 'n1', 'nf01'],
            match: true,
            wk: 12,
            bv: { l: 5 },
            matchRange: [0, 2],
          },
          { ent: '詞', i: ['rK'], match: false, bv: { l: 1 } },
          { ent: '辞', i: ['rK'], match: false },
        ],
        r: [
          { ent: 'ことば', p: ['i1', 'n1', 'nf01'], a: 3, match: true },
          { ent: 'けとば', app: 1, i: ['ok'], match: true },
        ],
        s: [
          {
            g: [{ str: 'language' }, { str: 'dialect' }],
            pos: ['n'],
            xref: [{ k: '言語' }],
            match: true,
          },
          {
            g: [
              { str: 'word' },
              { str: 'phrase' },
              { str: 'expression' },
              { str: 'term' },
            ],
            pos: ['n'],
            match: true,
          },
          {
            g: [
              { str: 'speech' },
              { str: '(manner of) speaking' },
              { str: '(use of) language' },
            ],
            pos: ['n'],
            match: true,
          },
          {
            g: [
              { str: 'words' },
              { str: 'remark' },
              { str: 'statement' },
              { str: 'comment' },
            ],
            pos: ['n'],
            match: true,
          },
          {
            g: [{ str: 'learning to speak' }, { str: 'language acquisition' }],
            pos: ['n'],
            match: true,
          },
        ],
        matchLen: 2,
      },
      {
        id: 1956230,
        k: [{ ent: '言', p: ['n1', 'nf06'], match: true, matchRange: [0, 1] }],
        r: [
          { ent: 'げん', p: ['n1', 'nf06'], a: 1, match: true },
          { ent: 'こと', a: 2, match: true },
        ],
        s: [
          {
            g: [{ str: 'word' }, { str: 'remark' }, { str: 'statement' }],
            pos: ['n'],
            match: true,
          },
        ],
        matchLen: 1,
      },
    ],
    more: false,
    matchLen: 2,
  },
  names: {
    type: 'names',
    data: [
      {
        id: 5255395,
        k: ['言葉'],
        r: ['かたり'],
        tr: [{ det: ['Katari'], type: ['given'] }],
        matchLen: 2,
      },
      {
        id: 5255396,
        k: ['言葉'],
        r: ['ことのは'],
        tr: [{ det: ['Kotonoha'], type: ['fem'] }],
        matchLen: 2,
      },
      {
        id: 5255397,
        k: ['言葉', '言'],
        r: ['ことは'],
        tr: [{ det: ['Kotoha'], type: ['fem'] }],
        matchLen: 2,
      },
      {
        id: 5255398,
        k: ['言葉', '言'],
        r: ['ことば'],
        tr: [{ det: ['Kotoba'], type: ['fem'] }],
        matchLen: 2,
      },
      {
        id: 5255260,
        k: ['言'],
        r: ['げん'],
        tr: [{ det: ['Gen'], type: ['given'] }],
        matchLen: 1,
      },
      {
        id: 5255261,
        k: ['言'],
        r: ['こと'],
        tr: [{ det: ['Koto'], type: ['fem'] }],
        matchLen: 1,
      },
      {
        id: 5255264,
        k: ['言'],
        r: ['ごん'],
        tr: [{ det: ['Gon'], type: ['given'] }],
        matchLen: 1,
      },
      {
        id: 5255265,
        k: ['言'],
        r: ['さちよ'],
        tr: [{ det: ['Sachiyo'], type: ['unclass'] }],
        matchLen: 1,
      },
    ],
    more: false,
    matchLen: 2,
  },
  kanji: {
    type: 'kanji',
    data: [
      {
        c: '言',
        r: {
          py: ['yan2'],
          on: ['ゲン', 'ゴン'],
          kun: ['い.う', 'こと'],
          na: ['とき'],
        },
        m: ['say', 'word'],
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
          nelson_c: 4309,
          nelson_n: 5552,
          halpern_njecd: 1941,
          halpern_kkd: 2440,
          halpern_kkld_2ed: 1698,
          heisig6: 357,
          henshall: 274,
          sh_kk2: 66,
          kanji_in_context: 203,
          busy_people: '2.8',
          kodansha_compact: 1653,
          skip: '2-1-6',
          sh_desc: '7a0.1',
          conning: 51,
        },
        misc: { sc: 7, gr: 2, freq: 83, jlpt: 4, kk: 9, wk: 5, jlptn: 5 },
        st: 'M48.4 11.3c4.4 2.4 8.9 7.7 10.4 11.5M14.9 34c2.5.5 6.9.7 9.4.5 23-2 40.8-4 60-4.7 4.2-.2 6.7.2 8.8.5M38.6 46.7c1.4.3 2.4.3 3.9.2 7-.6 18.6-2.3 22.8-2.6q2.6-.3 4.7.2M37.9 61.4q2.1.4 4.1.2c7.7-.6 20.3-2.3 24.8-2.8q3.1-.4 5.2.2M37 74.8a5 5 0 0 1 1.5 2.7c.9 6.7 2 11.4 3 18.5l.5 3.5M39.5 76.7c9.3-1.7 22.6-3.3 30.3-4.2 2.2-.3 3.6 1.2 3.3 2.3l-5 17M42.2 95.2c6.2-.6 16.6-1.4 25.3-2.3h4',
        m_lang: 'en',
        comp: [],
        cf: [],
      },
      {
        c: '葉',
        r: {
          py: ['xie2', 'ye4', 'she4'],
          on: ['ヨウ'],
          kun: ['は'],
          na: ['よ', 'わ'],
        },
        m: [
          'leaf',
          'plane',
          'lobe',
          'needle',
          'blade',
          'spear',
          'counter for flat things',
          'fragment',
          'piece',
        ],
        rad: {
          x: { r: 140, c: '⾋', na: ['くさ'], m: ['grass'], m_lang: 'en' },
        },
        refs: {
          nelson_c: 4001,
          nelson_n: 5129,
          halpern_njecd: 2321,
          halpern_kkd: 2912,
          halpern_kkld_2ed: 2024,
          heisig6: 243,
          henshall: 405,
          sh_kk2: 253,
          kanji_in_context: 569,
          kodansha_compact: 663,
          skip: '2-3-9',
          sh_desc: '3k9.21',
          conning: 605,
        },
        misc: { sc: 12, gr: 3, freq: 414, jlpt: 2, kk: 8, wk: 10, jlptn: 3 },
        st: 'M22 22.5q4 .6 8.1.2c12.5-1 36-3.5 49.8-4q4.5-.4 9.1.3M39.4 12.5c1.1 1.1 1.5 1.5 1.6 2.2 1.2 6.5 2 13 2.3 15.3M69.2 10.8q.7 1.7.1 3.6c-1.8 5.7-2.5 8-4.5 13.6M13.7 43.2q5.6.6 10.6 0c14.5-1 46.2-3.8 62.2-4.6 3.2-.1 6.1-.2 9.6.3M52.8 31.3a5 5 0 0 1 1.5 3.3l.4 12.9.1 4.6M73.5 29.8q1 1.5.8 3.7-.6 5.7-2.1 14.6M55.3 50.8l15.3-1.4 3.7-.2M34.3 33q1.4 1.6 1.5 2.8c.3 6.6.3 14 .3 19.9q-.2 4.2 3.2 3.8c11.9-.7 25.5-1.6 35.8-2q3.8-.4 7.5.3M23.8 73c3.2.8 6 .6 9.2.3C44.4 72 64.4 70.8 78.3 70a29 29 0 0 1 8 .5M53.3 61.5c.9 1 1.2 2.5 1.2 3.5l-.1 29.4-.2 5.6M51.5 72.5c0 1.3-.9 2.3-1.7 3.2a88 88 0 0 1-33 22M55.4 72c4.2 3 19 14.2 26.2 19.2 2.4 1.7 4.3 3 7.2 3.7',
        comp: [
          { c: '⽊', k: '木', na: ['き'], m: ['tree', 'wood'], m_lang: 'en' },
          {
            c: '⺾',
            k: '艸',
            na: ['くさかんむり'],
            m: ['grass'],
            m_lang: 'en',
            base: {
              c: '⾋',
              k: '艸',
              na: ['くさ'],
              m: ['grass'],
              m_lang: 'en',
            },
            is_rad: true,
          },
          {
            c: '世',
            na: ['よ'],
            m: ['generation', 'world', 'society', 'public'],
            m_lang: 'en',
          },
        ],
        m_lang: 'en',
        cf: [],
      },
    ],
    matchLen: 2,
  },
  resultType: 'full',
};

export default {
  default: (
    <CopyOverlay
      copyState={{ kind: 'active', index: 0, mode: 'mouse' }}
      includeAllSenses
      includeLessCommonHeadwords
      includePartOfSpeech
      kanjiReferences={[]}
      result={KOTOBA}
      series="words"
      showKanjiComponents
    />
  ),
};
