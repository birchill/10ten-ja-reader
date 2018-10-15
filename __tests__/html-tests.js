const htmlTests = [
  {
    description: 'a kanji entry',
    queryResult: {
      type: 'kanji',
      data: {
        kanji: '士',
        misc: {
          B: '33',
          DK: '2129',
          E: '494',
          F: '526',
          G: '4',
          H: '3405',
          I: '3p0.1',
          IN: '572',
          L: '319',
          N: '1160',
          P: '4-3-2',
          S: '3',
          U: '58EB',
          V: '1117',
          Y: 'shi4',
        },
        miscDisplay: [
          { abbrev: 'H', name: 'Halpern' },
          { abbrev: 'L', name: 'Heisig' },
          { abbrev: 'E', name: 'Henshall' },
          { abbrev: 'DK', name: 'Kanji Learners Dictionary' },
          { abbrev: 'N', name: 'Nelson' },
          { abbrev: 'V', name: 'New Nelson' },
          { abbrev: 'Y', name: 'PinYin' },
          { abbrev: 'P', name: 'Skip Pattern' },
          { abbrev: 'IN', name: 'Tuttle Kanji & Kana' },
          { abbrev: 'I', name: 'Tuttle Kanji Dictionary' },
          { abbrev: 'U', name: 'Unicode' },
        ],
        onkun: ['シ'],
        nanori: ['お', 'ま'],
        bushumei: ['さむらい'],
        radical: '士',
        eigo: 'gentleman, samurai, samurai radical (no. 33)',
      },
    },
  },
  {
    description: 'a kanji entry with components',
    queryResult: {
      type: 'kanji',
      data: {
        kanji: '鯖',
        misc: {
          B: '195',
          L: '2820',
          N: '5301',
          P: '1-11-8',
          U: '9BD6',
          S: '19',
          V: '6883',
          Y: 'qing1  zheng1',
        },
        miscDisplay: [
          { abbrev: 'H', name: 'Halpern' },
          { abbrev: 'U', name: 'Unicode' },
        ],
        components: [
          { radical: '魚', yomi: 'うお', english: 'fish' },
          { radical: '二', yomi: 'に', english: 'two' },
          { radical: '亠', yomi: 'なべぶた', english: 'lid' },
          { radical: '土', yomi: 'つち', english: 'earth' },
          { radical: '月', yomi: 'つき', english: 'moon' },
          { radical: '田', yomi: 'た', english: 'rice field' },
          { radical: '青', yomi: 'あお', english: 'blue' },
          { radical: '灬', yomi: 'れっか', english: 'fire' },
        ],
        onkun: ['セイ', 'ショウ', 'さば'],
        nanori: [],
        bushumei: [],
        radical: '魚',
        eigo: 'mackerel',
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
          definition:
            '(v5r,vi) to run/to travel (movement of vehicles)/to hurry to/to retreat (from battle)/to take flight/to run away from home/to elope/to tend heavily toward/(P)/',
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
          definition: '(n) Korean (language)',
          reason: null,
        },
        {
          kanjiKana: '韓国',
          kana: ['からくに'],
          definition: '(n,arch) China/Korea',
          reason: null,
        },
        {
          kanjiKana: '韓国',
          kana: ['かんこく'],
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
          definition: '(n) east/(P)',
          reason: null,
        },
        {
          kanjiKana: '東',
          kana: ['ひむかし'],
          definition: '(n,ok) east/(P)',
          reason: null,
        },
        {
          kanjiKana: '東',
          kana: ['ひんがし'],
          definition: '(n,ok) east/(P)',
          reason: null,
        },
        {
          kanjiKana: '東',
          kana: ['あずま'],
          definition:
            '(n,arch,abbr) east/eastern Japan/six-stringed Japanese zither/my spouse',
          reason: null,
        },
        {
          kanjiKana: '東',
          kana: ['あづま'],
          definition:
            '(n,arch,abbr,ok) east/eastern Japan/six-stringed Japanese zither/my spouse',
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
          definition: '(n) Korean (language)',
          reason: null,
        },
        {
          kanjiKana: '韓国',
          kana: ['からくに'],
          definition: '(n,arch) China/Korea',
          reason: null,
        },
        {
          kanjiKana: '韓国',
          kana: ['かんこく'],
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
          definition: '(n,arch) China/Korea',
          reason: null,
        },
        {
          kanjiKana: '中国',
          kana: ['ちゅうごく'],
          definition:
            '(n) China/South-west most region of Honshu/middle of a country/the Hiroshima area',
          reason: null,
        },
        {
          kanjiKana: '殿',
          kana: ['との'],
          definition: '(n) feudal lord/mansion/palace',
          reason: null,
        },
        {
          kanjiKana: '通貨',
          kana: ['つうか'],
          definition: '(n,adj-no) currency/(P)',
          reason: null,
        },
        {
          kanjiKana: 'スワップ',
          kana: [],
          definition: '(n,vs) swap/(P)',
          reason: null,
        },
        {
          kanjiKana: '延長',
          kana: ['えんちょう'],
          definition:
            '(n,vs) extension/elongation/prolongation/lengthening/Enchou era (923.4.11-931.4.26)/(P)',
          reason: null,
        },
        {
          kanjiKana: '合意',
          kana: ['ごうい'],
          definition:
            '(n,vs,adj-no) agreement/consent/mutual understanding/(P)',
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
          definition: 'Nakano (p,s)',
        },
        {
          names: [{ kanji: '中野', kana: 'なかのざき' }],
          definition: 'Nakanozaki (s)',
        },
        { names: [{ kanji: '中', kana: 'あたり' }], definition: 'Atari (f,s)' },
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
          definition: 'Akagumi Four (h)',
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
          definition: 'Agasa (f)',
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
          definition: '(s) Nippon',
        },
        {
          names: [{ kanji: '日本', kana: 'につぽん' }],
          definition: '(s) Nitsupon',
        },
        { names: [{ kanji: '日本', kana: 'にほん' }], definition: '(s) Nihon' },
        {
          names: [{ kanji: '日本', kana: 'ひのもと' }],
          definition: '(s) Hinomoto',
        },
        {
          names: [{ kanji: '日本', kana: 'ひもと' }],
          definition: '(u) Himoto',
        },
        {
          names: [{ kanji: '日本', kana: 'やまと' }],
          definition: '(s) Yamato',
        },
        {
          names: [{ kanji: '日本', kana: 'やまとの' }],
          definition: '(s) Yamatono',
        },
        { names: [{ kanji: '日', kana: 'あきら' }], definition: '(g) Akira' },
        {
          names: [{ kanji: '日', kana: 'くさなぎ' }],
          definition: '(s) Kusanagi',
        },
        {
          names: [{ kanji: '日', kana: 'くさやなぎ' }],
          definition: '(s) Kusayanagi',
        },
        { names: [{ kanji: '日', kana: 'じつ' }], definition: '(g) Jitsu' },
        {
          names: [{ kanji: '日', kana: 'たかにち' }],
          definition: '(s) Takanichi',
        },
        {
          names: [{ kanji: '日', kana: 'たちもり' }],
          definition: '(s) Tachimori',
        },
        { names: [{ kanji: '日', kana: 'にち' }], definition: '(p) Nichi' },
        {
          names: [{ kanji: '日', kana: 'にちれん' }],
          definition: '(u) Nichiren',
        },
        { names: [{ kanji: '日', kana: 'にっ' }], definition: '(p) Ni' },
        {
          names: [{ kanji: '日', kana: 'にっしゅう' }],
          definition: '(g) Nisshuu',
        },
        { names: [{ kanji: '日', kana: 'ひ' }], definition: '(p) Hi' },
        { names: [{ kanji: '日', kana: 'ひかる' }], definition: '(f) Hikaru' },
        { names: [{ kanji: '日', kana: 'ひさき' }], definition: '(s) Hisaki' },
      ],
      more: true,
      matchLen: 2,
      names: true,
    },
  },
];
