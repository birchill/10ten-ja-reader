import { describe, expect, it } from 'vitest';

import { getEntryToCopy, getFieldsToCopy, getWordToCopy } from './copy-text';

const getMessage = (id: string, replacements?: string | Array<string>) => {
  switch (id) {
    case 'content_kanji_base_radical':
      return `from ${replacements ? replacements[0] : '?'} (${
        replacements ? replacements[1] : '?'
      })`;
    case 'content_kanji_components_label':
      return 'components';
    case 'content_kanji_radical_label':
      return 'radical';
    case 'content_kanji_kentei_level_pre':
      return `Pre-${replacements ? replacements[0] : '?'}`;
    case 'content_kanji_kentei_level':
      return `${replacements ? replacements[0] : '?'}`;
    case 'gloss_type_short_expl':
      return 'expl.';
    case 'gloss_type_short_lit':
      return 'lit.';
    case 'gloss_type_short_fig':
      return 'fig.';
    case 'ref_label_radical':
      return 'Radical';
    case 'ref_label_nelson_r':
      return 'Radical (Nelson)';
    case 'ref_label_kk':
      return 'Kanji Kentei';
    case 'ref_label_jlpt':
      return 'JLPT';
    case 'ref_label_unicode':
      return 'Unicode';
    default:
      return 'Unrecognized string ID';
  }
};

describe('getWordToCopy', () => {
  it('copies a word from a word search', () => {
    expect(
      getWordToCopy({
        type: 'word',
        data: {
          id: 1,
          k: [{ ent: '理解', match: true, p: ['i1', 'n1', 'nf02'] }],
          r: [{ ent: 'りかい', match: true, p: ['i1', 'n1', 'nf02'], a: 1 }],
          s: [
            {
              pos: ['n', 'vs'],
              g: [
                { str: 'understanding' },
                { str: 'comprehension' },
                { str: 'appreciation' },
                { str: 'sympathy' },
              ],
              match: true,
            },
          ],
          romaji: ['rikai'],
        },
      })
    ).toEqual('理解');
  });

  it('copies a word when the k array is empty', () => {
    expect(
      getWordToCopy({
        type: 'word',
        data: {
          id: 1588730,
          k: [
            {
              ent: '選ぶ',
              p: ['i1', 'n1', 'nf02'],
              match: true,
              matchRange: [0, 2],
            },
            { ent: '撰ぶ', i: ['oK'], match: false },
            { ent: '択ぶ', i: ['oK'], match: false },
          ],
          r: [{ ent: 'えらぶ', p: ['i1', 'n1', 'nf02'], a: 2, match: true }],
          s: [
            {
              g: [{ str: 'to choose' }, { str: 'to select' }],
              pos: ['v5b', 'vt'],
              match: true,
            },
          ],
          reason: '< -te',
        },
      })
    ).toEqual('選ぶ');
  });

  it('copies only the matching headword(s) from a word search', () => {
    expect(
      getWordToCopy({
        type: 'word',
        data: {
          id: 1,
          k: [{ ent: '理解', match: true, p: ['i1', 'n1', 'nf02'] }],
          r: [{ ent: 'りかい', match: true, p: ['i1', 'n1', 'nf02'], a: 1 }],
          s: [
            {
              pos: ['n', 'vs'],
              g: [
                { str: 'understanding' },
                { str: 'comprehension' },
                { str: 'appreciation' },
                { str: 'sympathy' },
              ],
              match: true,
            },
          ],
          romaji: ['rikai'],
        },
      })
    ).toEqual('理解');
  });

  it('does not copy search-only kanji headword(s) from a word search', () => {
    expect(
      getWordToCopy({
        type: 'word',
        data: {
          id: 1169210,
          k: [
            { ent: '引き裂く', p: ['i1'], match: true },
            { ent: '引裂く', match: true },
            { ent: '引きさく', match: true, i: ['sK'] },
          ],
          r: [
            {
              ent: 'ひきさく',
              p: ['i1'],
              a: 3,
              match: true,
              matchRange: [0, 4],
            },
          ],
          s: [
            {
              g: [
                { str: 'to tear up' },
                { str: 'to tear off' },
                { str: 'to rip up' },
                { str: 'to tear to pieces' },
              ],
              pos: ['v5k', 'vt'],
              match: true,
            },
            {
              g: [
                { str: 'to (forcibly) separate (a couple, family, etc.)' },
                { str: 'to force apart' },
                { str: 'to tear apart' },
              ],
              pos: ['v5k', 'vt'],
              match: true,
            },
          ],
        },
      })
    ).toEqual('引き裂く, 引裂く');
  });

  it('copies non-matching headwords if the only matching ones are search-only', () => {
    expect(
      getWordToCopy({
        type: 'word',
        data: {
          id: 1169210,
          k: [
            { ent: '引き裂く', p: ['i1'], match: false },
            { ent: '引裂く', match: false },
            { ent: '引きさく', match: true, i: ['sK'], matchRange: [0, 4] },
          ],
          r: [{ ent: 'ひきさく', p: ['i1'], a: 3, match: true }],
          s: [
            {
              g: [
                { str: 'to tear up' },
                { str: 'to tear off' },
                { str: 'to rip up' },
                { str: 'to tear to pieces' },
              ],
              pos: ['v5k', 'vt'],
              match: true,
            },
            {
              g: [
                { str: 'to (forcibly) separate (a couple, family, etc.)' },
                { str: 'to force apart' },
                { str: 'to tear apart' },
              ],
              pos: ['v5k', 'vt'],
              match: true,
            },
          ],
        },
      })
    ).toEqual('引き裂く, 引裂く');
  });

  it('does not copy search-only kana headword(s) from a word search', () => {
    expect(
      getWordToCopy({
        type: 'word',
        data: {
          id: 1037940,
          k: [],
          r: [
            { ent: 'カネロニ', a: 0, match: false, matchRange: [0, 4] },
            { ent: 'カネローニ', match: false },
            { ent: 'カネローニー', match: true, i: ['sk'] },
          ],
          s: [
            {
              g: [{ str: 'cannelloni' }, { str: 'canneloni' }],
              pos: ['n'],
              field: ['food'],
              lsrc: [{ lang: 'it' }],
              match: true,
            },
          ],
        },
      })
    ).toEqual('カネロニ, カネローニ');
  });

  it('copies names from a name search', () => {
    expect(
      getWordToCopy({
        type: 'name',
        data: {
          id: 1,
          k: ['いぶ喜', 'いぶ希', 'いぶ記'],
          r: ['いぶき'],
          tr: [{ type: ['fem'], det: ['Ibuki'] }],
          matchLen: 3,
        },
      })
    ).toEqual('いぶ喜, いぶ希, いぶ記');
  });

  it('copies kanji from a kanji search', () => {
    expect(
      getWordToCopy({
        type: 'kanji',
        data: {
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
          refs: {},
          misc: { sc: 3, gr: 4, freq: 526, jlpt: 1, kk: 7 },
          m_lang: 'en',
          comp: [],
          cf: [],
        },
      })
    ).toEqual('士');
  });
});

describe('getEntryToCopy', () => {
  it('prepares text from word search results', () => {
    expect(
      getEntryToCopy(
        {
          type: 'word',
          data: {
            id: 1,
            k: [{ ent: '韓国語', p: ['s1'], match: true }],
            r: [{ ent: 'かんこくご', p: ['s1'], a: 0, match: true }],
            s: [{ pos: ['n'], g: [{ str: 'Korean (language)' }], match: true }],
            romaji: ['kankokugo'],
          },
        },
        { getMessage }
      )
    ).toEqual('韓国語 [かんこくご] (kankokugo)\n(n) Korean (language)');
  });

  it('prepares text and extended metadata from a word search', () => {
    expect(
      getEntryToCopy(
        {
          type: 'word',
          data: {
            id: 1,
            k: [],
            r: [{ ent: 'ホルモン', p: ['g1'], a: 1, match: true }],
            s: [
              {
                g: [{ str: 'hormone' }],
                pos: ['n', 'adj-no'],
                lsrc: [{ lang: 'de', src: 'Hormon' }],
                match: true,
              },
              {
                g: [{ str: "cows' or pigs' offal (entrails)" }],
                inf: 'from 放る物',
                pos: ['n', 'adj-no'],
                dial: ['ks'],
                match: true,
              },
            ],
          },
        },
        { getMessage }
      )
    ).toEqual(
      "ホルモン\n(1) (n,adj-no) hormone (de: Hormon)\n(2) (n,adj-no) (ksb:) cows' or pigs' offal (entrails) (from 放る物)"
    );
  });

  it('prepares text from a word search with gloss types', () => {
    expect(
      getEntryToCopy(
        {
          type: 'word',
          data: {
            id: 1,
            k: [{ ent: '虎嘯', match: true }],
            r: [{ ent: 'こしょう', a: 0, match: true }],
            s: [
              {
                g: [{ str: "tiger's howling" }],
                pos: ['n', 'vs'],
                match: true,
              },
              {
                g: [
                  {
                    str: 'being out and active in the world (of a hero, etc.)',
                    type: 'fig',
                  },
                ],
                pos: ['n', 'vs'],
                match: true,
              },
            ],
          },
        },
        { getMessage }
      )
    ).toEqual(
      "虎嘯 [こしょう]\n(1) (n,vs) tiger's howling\n(2) (n,vs) (fig.) being out and active in the world (of a hero, etc.)"
    );
  });

  it('does not copy search-only kanji headwords from a word search', () => {
    expect(
      getEntryToCopy(
        {
          type: 'word',
          data: {
            id: 1169210,
            k: [
              { ent: '引き裂く', p: ['i1'], match: true },
              { ent: '引裂く', match: true },
              { ent: '引きさく', match: true, i: ['sK'] },
            ],
            r: [
              {
                ent: 'ひきさく',
                p: ['i1'],
                a: 3,
                match: true,
                matchRange: [0, 4],
              },
            ],
            s: [
              {
                g: [
                  { str: 'to tear up' },
                  { str: 'to tear off' },
                  { str: 'to rip up' },
                  { str: 'to tear to pieces' },
                ],
                pos: ['v5k', 'vt'],
                match: true,
              },
              {
                g: [
                  { str: 'to (forcibly) separate (a couple, family, etc.)' },
                  { str: 'to force apart' },
                  { str: 'to tear apart' },
                ],
                pos: ['v5k', 'vt'],
                match: true,
              },
            ],
          },
        },
        { getMessage }
      )
    ).toEqual(
      '引き裂く, 引裂く [ひきさく]\n(1) (v5k,vt) to tear up; to tear off; to rip up; to tear to pieces\n(2) (v5k,vt) to (forcibly) separate (a couple, family, etc.); to force apart; to tear apart'
    );
  });

  it('does not copy search-only kana headwords from a word search', () => {
    expect(
      getEntryToCopy(
        {
          type: 'word',
          data: {
            id: 1037940,
            k: [],
            r: [
              { ent: 'カネロニ', a: 0, match: false, matchRange: [0, 4] },
              { ent: 'カネローニ', match: false },
              { ent: 'カネローニー', match: true, i: ['sk'] },
            ],
            s: [
              {
                g: [{ str: 'cannelloni' }, { str: 'canneloni' }],
                pos: ['n'],
                field: ['food'],
                lsrc: [{ lang: 'it' }],
                match: true,
              },
            ],
          },
        },
        { getMessage }
      )
    ).toEqual('カネロニ, カネローニ\n(n) (food) cannelloni; canneloni (it)');
  });

  it('simplifies the result of a word search when the corresponding flags are set', () => {
    expect(
      getEntryToCopy(
        {
          type: 'word',
          data: {
            id: 1589220,
            k: [
              {
                ent: '落ち着く',
                p: ['i1'],
                match: true,
                wk: 14,
                bv: { l: 2 },
                matchRange: [0, 4],
              },
              { ent: '落ちつく', p: ['n2', 'nf36'], match: false },
              { ent: '落着く', match: false },
              { ent: '落ち付く', i: ['rK'], match: false },
              { ent: '落付く', i: ['sK'], match: false },
            ],
            r: [
              { ent: 'おちつく', p: ['i1', 'n2', 'nf36'], a: 0, match: true },
            ],
            s: [
              {
                g: [
                  { str: 'to calm down' },
                  { str: 'to compose oneself' },
                  { str: 'to regain presence of mind' },
                  { str: 'to relax' },
                ],
                pos: ['v5k', 'vi'],
                match: true,
              },
              {
                g: [
                  { str: 'to calm down' },
                  { str: 'to settle down' },
                  { str: 'to die down' },
                  { str: 'to become stable' },
                  { str: 'to abate' },
                ],
                pos: ['v5k', 'vi'],
                match: true,
              },
              {
                g: [
                  { str: 'to settle down (in a location, job, etc.)' },
                  { str: 'to settle in' },
                ],
                pos: ['v5k', 'vi'],
                match: true,
              },
              {
                g: [
                  {
                    str: 'to be settled (of an arrangement, conclusion, etc.)',
                  },
                  { str: 'to be fixed' },
                  { str: 'to have been reached' },
                ],
                pos: ['v5k', 'vi'],
                match: true,
              },
              {
                g: [
                  { str: 'to harmonize with' },
                  { str: 'to harmonise with' },
                  { str: 'to match' },
                  { str: 'to suit' },
                  { str: 'to fit' },
                ],
                pos: ['v5k', 'vi'],
                match: true,
              },
              {
                g: [
                  { str: 'to be unobtrusive' },
                  { str: 'to be quiet' },
                  { str: 'to be subdued' },
                ],
                pos: ['v5k', 'vi'],
                xref: [{ k: '落ち着いた', r: 'おちついた', sense: 3 }],
                inf: 'usu. before a noun as 落ち着いた',
                match: true,
              },
            ],
          },
        },
        {
          getMessage,
          includeAllSenses: false,
          includeLessCommonHeadwords: false,
          includePartOfSpeech: false,
        }
      )
    ).toEqual(
      '落ち着く [おちつく] to calm down; to compose oneself; to regain presence of mind; to relax'
    );
  });

  it('prepares text from name search results', () => {
    expect(
      getEntryToCopy(
        {
          type: 'name',
          data: {
            id: 1,
            k: ['いぶ喜', 'いぶ希', 'いぶ記'],
            r: ['いぶき'],
            tr: [{ type: ['fem'], det: ['Ibuki'] }],
            matchLen: 3,
          },
        },
        { getMessage }
      )
    ).toEqual('いぶ喜, いぶ希, いぶ記 [いぶき]\n(fem) Ibuki');
  });

  it('prepares text from kanji search results', () => {
    expect(
      getEntryToCopy(
        {
          type: 'kanji',
          data: {
            c: '抜',
            r: {
              on: ['バツ', 'ハツ', 'ハイ'],
              kun: ['ぬ.く', 'ぬ.ける', 'ぬ.かす', 'ぬ.かる'],
              na: ['ぬき'],
            },
            m: ['slip out', 'extract'],
            rad: {
              x: 64,
              b: '⺘',
              k: '扌',
              na: ['てへん'],
              m: ['hand'],
              m_lang: 'en',
              base: { b: '⼿', k: '手', na: ['て'], m: ['hand'], m_lang: 'en' },
            },
            refs: {
              nelson_c: 1854,
              nelson_n: 2093,
              halpern_njecd: 246,
              halpern_kkld: 183,
              halpern_kkld_2ed: 219,
              heisig: 705,
              heisig6: 761,
              henshall: 1708,
              sh_kk: 1713,
              sh_kk2: 1830,
              kanji_in_context: 769,
              kodansha_compact: 864,
              skip: '1-3-4',
              sh_desc: '3c4.10',
              conning: 1951,
            },
            misc: { sc: 7, gr: 8, freq: 726, jlpt: 2, kk: 4 },
            comp: [
              {
                c: '⼇',
                na: ['なべぶた', 'けいさん', 'けいさんかんむり'],
                m: ['lid'],
                m_lang: 'en',
              },
              {
                c: '⼜',
                na: ['また'],
                m: ['or again', 'furthermore', 'on the other hand'],
                m_lang: 'en',
              },
              {
                c: '⼡',
                na: ['ふゆがしら', 'のまたかんむり', 'のまた', 'ちかんむり'],
                m: ['winter'],
                m_lang: 'en',
              },
              { c: '⺘', na: ['てへん'], m: ['hand'], m_lang: 'en' },
            ],
            m_lang: 'en',
            cf: [],
          },
        },
        {
          getMessage,
          showKanjiComponents: true,
          kanjiReferences: [
            'radical',
            'nelson_r',
            'kk',
            'jlpt',
            'unicode',
            'nelson_c',
            'henshall',
            'conning',
            'skip',
            'busy_people',
          ],
        }
      )
    ).toEqual(
      '抜 [バツ、ハツ、ハイ、ぬ.く、ぬ.ける、ぬ.かす、ぬ.かる] (ぬき) slip out, extract; radical: ⺘（てへん） from ⼿ (て); components: ⼇ (なべぶた, lid), ⼜ (また, or again), ⼡ (ふゆがしら, winter), ⺘ (てへん, hand); Classic Nelson 1854; Conning 1951; Henshall 1708; Japanese for Busy People -; JLPT 2; Kanji Kentei 4; Radical 64 ⼿; SKIP 1-3-4; Unicode U+629C'
    );
  });
});

describe('getFieldsToCopy', () => {
  it('prepares text from word search results', () => {
    expect(
      getFieldsToCopy(
        {
          type: 'word',
          data: {
            id: 1,
            k: [{ ent: '韓国', match: true, p: ['n1', 'nf01'] }],
            r: [{ ent: 'かんこく', match: true, p: ['n1', 'nf01'], a: 0 }],
            s: [
              {
                pos: ['n', 'adj-no'],
                g: [{ str: 'South Korea' }, { str: 'Republic of Korea' }],
                misc: ['abbr'],
                match: true,
              },
              {
                pos: ['n', 'adj-no'],
                g: [{ str: 'Korean Empire (1897-1910)' }],
                misc: ['abbr'],
                match: true,
              },
            ],
            romaji: ['kankoku'],
          },
        },
        { getMessage }
      )
    ).toEqual(
      '韓国\tかんこく\tkankoku\t(1) (n,adj-no) (abbr) South Korea; Republic of Korea (2) (n,adj-no) (abbr) Korean Empire (1897-1910)'
    );
  });

  it('does not copy search-only kanji headwords from a word search', () => {
    expect(
      getFieldsToCopy(
        {
          type: 'word',
          data: {
            id: 1169210,
            k: [
              { ent: '引き裂く', p: ['i1'], match: true },
              { ent: '引裂く', match: true },
              { ent: '引きさく', match: true, i: ['sK'] },
            ],
            r: [
              {
                ent: 'ひきさく',
                p: ['i1'],
                a: 3,
                match: true,
                matchRange: [0, 4],
              },
            ],
            s: [
              {
                g: [
                  { str: 'to tear up' },
                  { str: 'to tear off' },
                  { str: 'to rip up' },
                  { str: 'to tear to pieces' },
                ],
                pos: ['v5k', 'vt'],
                match: true,
              },
              {
                g: [
                  { str: 'to (forcibly) separate (a couple, family, etc.)' },
                  { str: 'to force apart' },
                  { str: 'to tear apart' },
                ],
                pos: ['v5k', 'vt'],
                match: true,
              },
            ],
          },
        },
        { getMessage }
      )
    ).toEqual(
      '引き裂く; 引裂く\tひきさく\t(1) (v5k,vt) to tear up; to tear off; to rip up; to tear to pieces (2) (v5k,vt) to (forcibly) separate (a couple, family, etc.); to force apart; to tear apart'
    );
  });

  it('does not copy search-only kana headwords from a word search', () => {
    expect(
      getFieldsToCopy(
        {
          type: 'word',
          data: {
            id: 1037940,
            k: [],
            r: [
              { ent: 'カネロニ', a: 0, match: false, matchRange: [0, 4] },
              { ent: 'カネローニ', match: false },
              { ent: 'カネローニー', match: true, i: ['sk'] },
            ],
            s: [
              {
                g: [{ str: 'cannelloni' }, { str: 'canneloni' }],
                pos: ['n'],
                field: ['food'],
                lsrc: [{ lang: 'it' }],
                match: true,
              },
            ],
          },
        },
        { getMessage }
      )
    ).toEqual('\tカネロニ; カネローニ\t(n) (food) cannelloni; canneloni (it)');
  });

  it('simplifies the result of a word search when the corresponding flags are set', () => {
    expect(
      getFieldsToCopy(
        {
          type: 'word',
          data: {
            id: 1589220,
            k: [
              {
                ent: '落ち着く',
                p: ['i1'],
                match: true,
                wk: 14,
                bv: { l: 2 },
                matchRange: [0, 4],
              },
              { ent: '落ちつく', p: ['n2', 'nf36'], match: false },
              { ent: '落着く', match: false },
              { ent: '落ち付く', i: ['rK'], match: false },
              { ent: '落付く', i: ['sK'], match: false },
            ],
            r: [
              { ent: 'おちつく', p: ['i1', 'n2', 'nf36'], a: 0, match: true },
            ],
            s: [
              {
                g: [
                  { str: 'to calm down' },
                  { str: 'to compose oneself' },
                  { str: 'to regain presence of mind' },
                  { str: 'to relax' },
                ],
                pos: ['v5k', 'vi'],
                match: true,
              },
              {
                g: [
                  { str: 'to calm down' },
                  { str: 'to settle down' },
                  { str: 'to die down' },
                  { str: 'to become stable' },
                  { str: 'to abate' },
                ],
                pos: ['v5k', 'vi'],
                match: true,
              },
              {
                g: [
                  { str: 'to settle down (in a location, job, etc.)' },
                  { str: 'to settle in' },
                ],
                pos: ['v5k', 'vi'],
                match: true,
              },
              {
                g: [
                  {
                    str: 'to be settled (of an arrangement, conclusion, etc.)',
                  },
                  { str: 'to be fixed' },
                  { str: 'to have been reached' },
                ],
                pos: ['v5k', 'vi'],
                match: true,
              },
              {
                g: [
                  { str: 'to harmonize with' },
                  { str: 'to harmonise with' },
                  { str: 'to match' },
                  { str: 'to suit' },
                  { str: 'to fit' },
                ],
                pos: ['v5k', 'vi'],
                match: true,
              },
              {
                g: [
                  { str: 'to be unobtrusive' },
                  { str: 'to be quiet' },
                  { str: 'to be subdued' },
                ],
                pos: ['v5k', 'vi'],
                xref: [{ k: '落ち着いた', r: 'おちついた', sense: 3 }],
                inf: 'usu. before a noun as 落ち着いた',
                match: true,
              },
            ],
          },
        },
        {
          getMessage,
          includeAllSenses: false,
          includeLessCommonHeadwords: false,
          includePartOfSpeech: false,
        }
      )
    ).toEqual(
      '落ち着く\tおちつく\tto calm down; to compose oneself; to regain presence of mind; to relax'
    );
  });

  it('prepares text from name search results', () => {
    expect(
      getFieldsToCopy(
        {
          type: 'name',
          data: {
            id: 1,
            k: ['いぶ喜', 'いぶ希', 'いぶ記'],
            r: ['いぶき'],
            tr: [{ type: ['fem'], det: ['Ibuki'] }],
            matchLen: 3,
          },
        },
        { getMessage }
      )
    ).toEqual(
      'いぶ喜\tいぶき\t(fem) Ibuki\nいぶ希\tいぶき\t(fem) Ibuki\nいぶ記\tいぶき\t(fem) Ibuki'
    );
  });

  it('prepares text from kanji search results', () => {
    expect(
      getFieldsToCopy(
        {
          type: 'kanji',
          data: {
            c: '抜',
            r: {
              on: ['バツ', 'ハツ', 'ハイ'],
              kun: ['ぬ.く', 'ぬ.ける', 'ぬ.かす', 'ぬ.かる'],
              na: ['ぬき'],
            },
            m: ['slip out', 'extract'],
            rad: {
              x: 64,
              b: '⺘',
              k: '扌',
              na: ['てへん'],
              m: ['hand'],
              m_lang: 'en',
              base: { b: '⼿', k: '手', na: ['て'], m: ['hand'], m_lang: 'en' },
            },
            refs: {
              nelson_c: 1854,
              nelson_n: 2093,
              halpern_njecd: 246,
              halpern_kkld: 183,
              halpern_kkld_2ed: 219,
              heisig: 705,
              heisig6: 761,
              henshall: 1708,
              sh_kk: 1713,
              sh_kk2: 1830,
              kanji_in_context: 769,
              kodansha_compact: 864,
              skip: '1-3-4',
              sh_desc: '3c4.10',
              conning: 1951,
            },
            misc: { sc: 7, gr: 8, freq: 726, jlpt: 2, kk: 4 },
            comp: [
              {
                c: '⼇',
                na: ['なべぶた', 'けいさん', 'けいさんかんむり'],
                m: ['lid'],
                m_lang: 'en',
              },
              {
                c: '⼜',
                na: ['また'],
                m: ['or again', 'furthermore', 'on the other hand'],
                m_lang: 'en',
              },
              {
                c: '⼡',
                na: ['ふゆがしら', 'のまたかんむり', 'のまた', 'ちかんむり'],
                m: ['winter'],
                m_lang: 'en',
              },
              { c: '⺘', na: ['てへん'], m: ['hand'], m_lang: 'en' },
            ],
            m_lang: 'en',
            cf: [],
          },
        },
        {
          getMessage,
          showKanjiComponents: true,
          kanjiReferences: [
            'radical',
            'nelson_r',
            'kk',
            'jlpt',
            'unicode',
            'nelson_c',
            'henshall',
            'conning',
            'skip',
            'busy_people',
          ],
        }
      )
    ).toEqual(
      '抜\tバツ、ハツ、ハイ、ぬ.く、ぬ.ける、ぬ.かす、ぬ.かる\tぬき\tslip out, extract\t⼇⼜⼡⺘\tClassic Nelson 1854\tConning 1951\tHenshall 1708\tJapanese for Busy People -\tJLPT 2\tKanji Kentei 4\t64 ⼿\t64 ⼿\tSKIP 1-3-4\tU+629C'
    );
  });
});
