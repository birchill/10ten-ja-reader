import { getEntryToCopy, getFieldsToCopy, getWordToCopy } from './copy-text';

// Mock browser.i18n.getMessage
global.browser = {
  i18n: {
    getMessage: (id: string, replacements?: Array<string>) => {
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
    },
  },
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
      })
    ).toEqual('ホルモン');
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
          refs: {},
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
        },
      })
    ).toEqual('士');
  });
});

describe('getEntryToCopy', () => {
  it('prepares text from word search results', () => {
    expect(
      getEntryToCopy({
        type: 'word',
        data: {
          id: 1,
          k: [{ ent: '韓国語', p: ['s1'], match: true }],
          r: [{ ent: 'かんこくご', p: ['s1'], a: 0, match: true }],
          s: [{ pos: ['n'], g: [{ str: 'Korean (language)' }], match: true }],
          romaji: ['kankokugo'],
        },
      })
    ).toEqual('韓国語 [かんこくご] (kankokugo) (n) Korean (language)');
  });

  it('prepares text and extended metadata from a word search', () => {
    expect(
      getEntryToCopy({
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
      })
    ).toEqual(
      "ホルモン (1) (n,adj-no) hormone (de: Hormon) (2) (n,adj-no) (ksb:) cows' or pigs' offal (entrails) (from 放る物)"
    );
  });

  it('prepares text from a word search with gloss types', () => {
    expect(
      getEntryToCopy({
        type: 'word',
        data: {
          id: 1,
          k: [{ ent: '虎嘯', match: true }],
          r: [{ ent: 'こしょう', a: 0, match: true }],
          s: [
            { g: [{ str: "tiger's howling" }], pos: ['n', 'vs'], match: true },
            {
              g: [
                {
                  str: 'being out and active in the world (of a hero, etc.)',
                  type: 3,
                },
              ],
              pos: ['n', 'vs'],
              match: true,
            },
          ],
        },
      })
    ).toEqual(
      "虎嘯 [こしょう] (1) (n,vs) tiger's howling (2) (n,vs) (fig.) being out and active in the world (of a hero, etc.)"
    );
  });

  it('prepares text from name search results', () => {
    expect(
      getEntryToCopy({
        type: 'name',
        data: {
          id: 1,
          k: ['いぶ喜', 'いぶ希', 'いぶ記'],
          r: ['いぶき'],
          tr: [{ type: ['fem'], det: ['Ibuki'] }],
          matchLen: 3,
        },
      })
    ).toEqual('いぶ喜, いぶ希, いぶ記 [いぶき] (fem) Ibuki');
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
              base: {
                b: '⼿',
                k: '手',
                na: ['て'],
                m: ['hand'],
                m_lang: 'en',
              },
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
            misc: {
              sc: 7,
              gr: 8,
              freq: 726,
              jlpt: 2,
              kk: 4,
            },
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
              {
                c: '⺘',
                na: ['てへん'],
                m: ['hand'],
                m_lang: 'en',
              },
            ],
            m_lang: 'en',
            cf: [],
          },
        },
        {
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
      getFieldsToCopy({
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
      })
    ).toEqual(
      '韓国\tかんこく\tkankoku\t(1) (n,adj-no) (abbr) South Korea; Republic of Korea (2) (n,adj-no) (abbr) Korean Empire (1897-1910)'
    );
  });

  it('prepares text from name search results', () => {
    expect(
      getFieldsToCopy({
        type: 'name',
        data: {
          id: 1,
          k: ['いぶ喜', 'いぶ希', 'いぶ記'],
          r: ['いぶき'],
          tr: [{ type: ['fem'], det: ['Ibuki'] }],
          matchLen: 3,
        },
      })
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
              base: {
                b: '⼿',
                k: '手',
                na: ['て'],
                m: ['hand'],
                m_lang: 'en',
              },
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
            misc: {
              sc: 7,
              gr: 8,
              freq: 726,
              jlpt: 2,
              kk: 4,
            },
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
              {
                c: '⺘',
                na: ['てへん'],
                m: ['hand'],
                m_lang: 'en',
              },
            ],
            m_lang: 'en',
            cf: [],
          },
        },
        {
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
