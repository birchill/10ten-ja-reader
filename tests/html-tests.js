const htmlTests = [
  {
    description: 'a kanji entry',
    queryResult: {
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
      },
    },
  },
  {
    description: 'a kanji entry with components',
    queryResult: {
      type: 'kanji',
      data: {
        c: '鯖',
        r: {
          on: ['セイ', 'ショウ'],
          kun: ['さば'],
        },
        m: ['mackerel'],
        rad: {
          x: 195,
          b: '⿂',
          k: '魚',
          na: ['うお'],
          m: ['fish'],
          m_lang: 'en',
        },
        refs: {
          nelson_c: 5301,
          nelson_n: 6883,
          heisig: 2820,
          heisig6: 2835,
          skip: '1-11-8',
          sh_desc: '11a8.6',
        },
        misc: {
          sc: 19,
          kk: 15,
        },
        comp: [
          {
            c: '⿂',
            na: ['うお'],
            m: ['fish'],
            m_lang: 'en',
          },
          {
            c: '⾭',
            na: ['あお'],
            m: ['blue', 'green'],
            m_lang: 'en',
          },
        ],
        m_lang: 'en',
      },
    },
  },
  {
    description: 'a kanji entry with a base radical',
    queryResult: {
      type: 'kanji',
      data: {
        c: '抜',
        r: {
          on: ['バツ', 'ハツ', 'ハイ'],
          kun: ['ぬ.く', '-ぬ.く', 'ぬ.き', 'ぬ.ける', 'ぬ.かす', 'ぬ.かる'],
          na: ['ぬき'],
        },
        m: [
          'slip out',
          'extract',
          'pull out',
          'pilfer',
          'quote',
          'remove',
          'omit',
        ],
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
      },
    },
  },
  {
    description: 'a word search result',
    queryResult: {
      type: 'words',
      data: [
        {
          kanjiKana: '走る',
          kana: ['はしる'],
          romaji: [],
          definition:
            '(v5r,vi) to run; to travel (movement of vehicles); to hurry to; to retreat (from battle); to take flight; to run away from home; to elope; to tend heavily toward; (P); ',
          reason: '< past',
        },
      ],
      more: false,
      matchLen: 3,
    },
  },
  {
    description: 'a word search result with multiple entries',
    queryResult: {
      type: 'words',
      data: [
        {
          kanjiKana: '韓国語',
          kana: ['かんこくご'],
          romaji: [],
          definition: '(n) Korean (language)',
          reason: null,
        },
        {
          kanjiKana: '韓国',
          kana: ['からくに'],
          romaji: [],
          definition: '(n,arch) China; Korea',
          reason: null,
        },
        {
          kanjiKana: '韓国',
          kana: ['かんこく'],
          romaji: [],
          definition: '(n) (South) Korea',
          reason: null,
        },
      ],
      more: false,
      matchLen: 3,
    },
  },
  {
    description: 'a word search result with overlapping entries',
    queryResult: {
      type: 'words',
      data: [
        {
          kanjiKana: '東',
          kana: ['ひがし'],
          romaji: [],
          definition: '(n) east; (P)',
          reason: null,
        },
        {
          kanjiKana: '東',
          kana: ['ひむかし'],
          romaji: [],
          definition: '(n,ok) east; (P)',
          reason: null,
        },
        {
          kanjiKana: '東',
          kana: ['ひんがし'],
          romaji: [],
          definition: '(n,ok) east; (P)',
          reason: null,
        },
        {
          kanjiKana: '東',
          kana: ['あずま'],
          romaji: [],
          definition:
            '(n,arch,abbr) east; eastern Japan; six-stringed Japanese zither; my spouse',
          reason: null,
        },
        {
          kanjiKana: '東',
          kana: ['あづま'],
          romaji: [],
          definition:
            '(n,arch,abbr,ok) east; eastern Japan; six-stringed Japanese zither; my spouse',
          reason: null,
        },
      ],
      more: false,
      matchLen: 1,
    },
  },
  {
    description: "a word search result with the 'readingOnly' setting in place",
    queryResult: {
      type: 'words',
      data: [
        {
          kanjiKana: '韓国語',
          kana: ['かんこくご'],
          romaji: [],
          definition: '(n) Korean (language)',
          reason: null,
        },
        {
          kanjiKana: '韓国',
          kana: ['からくに'],
          romaji: [],
          definition: '(n,arch) China; Korea',
          reason: null,
        },
        {
          kanjiKana: '韓国',
          kana: ['かんこく'],
          romaji: [],
          definition: '(n) (South) Korea',
          reason: null,
        },
      ],
      more: false,
      matchLen: 3,
    },
    extraConfig: {
      readingOnly: true,
    },
  },
  {
    description: 'a translate result',
    queryResult: {
      type: 'words',
      data: [
        {
          kanjiKana: '韓国',
          kana: ['からくに'],
          romaji: [],
          definition: '(n,arch) China; Korea',
          reason: null,
        },
        {
          kanjiKana: '中国',
          kana: ['ちゅうごく'],
          romaji: [],
          definition:
            '(n) China; South-west most region of Honshu; middle of a country; the Hiroshima area',
          reason: null,
        },
        {
          kanjiKana: '殿',
          kana: ['との'],
          romaji: [],
          definition: '(n) feudal lord; mansion; palace',
          reason: null,
        },
        {
          kanjiKana: '通貨',
          kana: ['つうか'],
          romaji: [],
          definition: '(n,adj-no) currency; (P)',
          reason: null,
        },
        {
          kanjiKana: 'スワップ',
          kana: [],
          romaji: [],
          definition: '(n,vs) swap; (P)',
          reason: null,
        },
        {
          kanjiKana: '延長',
          kana: ['えんちょう'],
          romaji: [],
          definition:
            '(n,vs) extension; elongation; prolongation; lengthening; Enchou era (923.4.11-931.4.26); (P)',
          reason: null,
        },
        {
          kanjiKana: '合意',
          kana: ['ごうい'],
          romaji: [],
          definition:
            '(n,vs,adj-no) agreement; consent; mutual understanding; (P)',
          reason: null,
        },
      ],
      textLen: 17,
      more: true,
      title: '韓国、中国との通貨スワップ延長合意を発表',
    },
  },
  {
    description: 'a name search result',
    queryResult: {
      type: 'names',
      data: [
        {
          names: [{ kanji: '中野', kana: 'なかの' }],
          definition: {
            tags: [2, 0],
            text: 'Nakano',
          },
        },
        {
          names: [{ kanji: '中野', kana: 'なかのざき' }],
          definition: {
            tags: [0],
            text: 'Nakanozaki',
          },
        },
        {
          names: [{ kanji: '中', kana: 'あたり' }],
          definition: {
            tags: [4, 0],
            text: 'Atari',
          },
        },
      ],
      more: true,
      matchLen: 2,
      names: true,
    },
  },
  /*
   * This no longer makes sense as a test now that we're not testing the parsing
   * of the entry here.
   */
  {
    description: 'a name search result with a nested definition',
    queryResult: {
      type: 'names',
      data: [
        {
          names: [{ kanji: 'あか組４', kana: 'あかぐみフォー' }],
          definition: {
            tags: [6],
            text: 'Akagumi Four',
          },
        },
      ],
      more: false,
      matchLen: 4,
      names: true,
    },
  },
  {
    description: 'a name search result without a separate reading',
    queryResult: {
      type: 'names',
      data: [
        {
          names: [{ kana: 'あがさ' }],
          definition: {
            tags: [4],
            text: 'Agasa',
          },
        },
      ],
      more: false,
      matchLen: 3,
      names: true,
    },
  },
  {
    description: 'a multicol name search result',
    queryResult: {
      type: 'names',
      data: [
        {
          names: [{ kanji: '日本', kana: 'にっぽん' }],
          definition: { tags: [0], text: 'Nippon' },
        },
        {
          names: [{ kanji: '日本', kana: 'につぽん' }],
          definition: { tags: [0], text: 'Nitsupon' },
        },
        {
          names: [{ kanji: '日本', kana: 'にほん' }],
          definition: { tags: [0], text: 'Nihon' },
        },
        {
          names: [{ kanji: '日本', kana: 'ひのもと' }],
          definition: { tags: [0], text: 'Hinomoto' },
        },
        {
          names: [{ kanji: '日本', kana: 'ひもと' }],
          definition: { tags: [2], text: 'Himoto' },
        },
        {
          names: [{ kanji: '日本', kana: 'やまと' }],
          definition: { tags: [0], text: 'Yamato' },
        },
        {
          names: [{ kanji: '日本', kana: 'やまとの' }],
          definition: { tags: [0], text: 'Yamatono' },
        },
        {
          names: [{ kanji: '日', kana: 'あきら' }],
          definition: { tags: [3], text: 'Akira' },
        },
        {
          names: [{ kanji: '日', kana: 'くさなぎ' }],
          definition: { tags: [0], text: 'Kusanagi' },
        },
        {
          names: [{ kanji: '日', kana: 'くさやなぎ' }],
          definition: { tags: [0], text: 'Kusayanagi' },
        },
        {
          names: [{ kanji: '日', kana: 'じつ' }],
          definition: { tags: [3], text: 'Jitsu' },
        },
        {
          names: [{ kanji: '日', kana: 'たかにち' }],
          definition: { tags: [0], text: 'Takanichi' },
        },
        {
          names: [{ kanji: '日', kana: 'たちもり' }],
          definition: { tags: [0], text: 'Tachimori' },
        },
        {
          names: [{ kanji: '日', kana: 'にち' }],
          definition: { tags: [1], text: 'Nichi' },
        },
        {
          names: [{ kanji: '日', kana: 'にちれん' }],
          definition: { tags: [2], text: 'Nichiren' },
        },
        {
          names: [{ kanji: '日', kana: 'にっ' }],
          definition: { tags: [1], text: 'Ni' },
        },
        {
          names: [{ kanji: '日', kana: 'にっしゅう' }],
          definition: { tags: [3], text: 'Nisshuu' },
        },
        {
          names: [{ kanji: '日', kana: 'ひ' }],
          definition: { tags: [1], text: 'Hi' },
        },
        {
          names: [{ kanji: '日', kana: 'ひかる' }],
          definition: { tags: [4], text: 'Hikaru' },
        },
        {
          names: [{ kanji: '日', kana: 'ひさき' }],
          definition: { tags: [0], text: 'Hisaki' },
        },
      ],
      more: true,
      matchLen: 2,
      names: true,
    },
  },
];
