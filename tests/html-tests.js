// eslint-disable-next-line @typescript-eslint/no-unused-vars
const htmlTests = [
  {
    description: 'a word search result',
    queryResult: {
      words: {
        type: 'words',
        data: [
          {
            k: [
              { ent: '走る', p: ['i1', 'n1', 'nf10'], wk: 5, match: true },
              { ent: '奔る', match: false },
              { ent: '趨る', match: false },
            ],
            r: [{ ent: 'はしる', p: ['i1', 'n1', 'nf10'], a: 2, match: true }],
            s: [
              { g: [{ str: 'to run' }], pos: ['v5r', 'vi'], match: true },
              {
                g: [
                  { str: 'to travel (movement of vehicles)' },
                  { str: 'to drive' },
                  { str: 'to flow (e.g. energy)' },
                ],
                pos: ['v5r', 'vi'],
                match: true,
              },
              { g: [{ str: 'to hurry to' }], pos: ['v5r', 'vi'], match: true },
              {
                g: [
                  { str: 'to retreat (from battle)' },
                  { str: 'to take flight' },
                ],
                pos: ['v5r', 'vi'],
                match: true,
              },
              {
                g: [{ str: 'to run away from home' }],
                inf: 'esp. 奔る',
                pos: ['v5r', 'vi'],
                match: true,
              },
              { g: [{ str: 'to elope' }], pos: ['v5r', 'vi'], match: true },
              {
                g: [{ str: 'to tend heavily toward' }],
                inf: 'esp. 趨る',
                pos: ['v5r', 'vi'],
                match: true,
              },
              {
                g: [
                  { str: 'to flash' },
                  { str: 'to streak' },
                  { str: 'to shoot through (e.g. pain)' },
                ],
                pos: ['v5r', 'vi'],
                match: true,
              },
              {
                g: [
                  { str: 'to get involved' },
                  { str: 'to take (to something)' },
                  { str: 'to get wrapped up in' },
                ],
                pos: ['v5r', 'vi'],
                match: true,
              },
            ],
          },
        ],
        more: false,
        matchLen: 2,
      },
    },
  },
  {
    description: 'a word search result with multiple entries',
    queryResult: {
      words: {
        type: 'words',
        data: [
          {
            k: [{ ent: '韓国語', p: ['s1'], match: true }],
            r: [{ ent: 'かんこくご', p: ['s1'], a: 0, match: true }],
            s: [{ g: [{ str: 'Korean (language)' }], pos: ['n'], match: true }],
          },
          {
            k: [{ ent: '韓国', p: ['n1', 'nf01'], wk: 29, match: true }],
            r: [{ ent: 'かんこく', p: ['n1', 'nf01'], a: 0, match: true }],
            s: [
              {
                g: [{ str: 'South Korea' }, { str: 'Republic of Korea' }],
                pos: ['n', 'adj-no'],
                misc: ['abbr'],
                match: true,
              },
              {
                g: [{ str: 'Korean Empire (1897-1910)' }],
                pos: ['n', 'adj-no'],
                misc: ['abbr'],
                match: true,
              },
            ],
          },
          {
            k: [
              { ent: '唐国', match: false },
              { ent: '韓国', match: true },
            ],
            r: [{ ent: 'からくに', match: true }],
            s: [
              {
                g: [{ str: 'China' }, { str: 'Korea' }],
                pos: ['n'],
                misc: ['arch'],
                match: true,
              },
            ],
          },
          {
            k: [
              { ent: '唐', match: false },
              { ent: '韓', match: true },
              { ent: '漢', match: false },
            ],
            r: [{ ent: 'から', a: 1, match: true }],
            s: [
              {
                g: [
                  {
                    str: 'China (sometimes also used in ref. to Korea or other foreign countries)',
                  },
                ],
                pos: ['n', 'n-pref'],
                misc: ['arch'],
                match: true,
              },
            ],
          },
        ],
        more: false,
        matchLen: 3,
      },
    },
  },
  {
    description: 'a word search result with overlapping entries',
    queryResult: {
      words: {
        type: 'words',
        data: [
          {
            k: [{ ent: '東', p: ['i1', 'n1', 'nf01'], match: true }],
            r: [
              {
                ent: 'ひがし',
                p: ['i1', 'n1', 'nf01'],
                a: [{ i: 0 }, { i: 3 }],
                match: true,
              },
              { ent: 'ひむかし', i: ['ok'], match: true },
              { ent: 'ひんがし', i: ['ok'], a: 0, match: true },
            ],
            s: [{ g: [{ str: 'east' }], pos: ['n'], match: true }],
          },
          {
            k: [
              { ent: '東', match: true },
              { ent: '吾妻', match: false },
              { ent: '吾嬬', match: false },
            ],
            r: [
              { ent: 'あずま', a: 1, match: true },
              { ent: 'あづま', i: ['ok'], match: true },
            ],
            s: [
              {
                g: [
                  {
                    str: 'eastern Japan (esp. Kamakura or Edo, from perspective of Kyoto or Nara)',
                  },
                  { str: 'eastern provinces' },
                ],
                pos: ['n'],
                misc: ['arch'],
                match: true,
              },
              { g: [{ str: 'east' }], pos: ['n'], misc: ['arch'], match: true },
              {
                g: [
                  { str: 'wagon' },
                  { str: 'yamatogoto' },
                  { str: 'six-stringed native Japanese zither', type: 'expl' },
                ],
                pos: ['n'],
                misc: ['abbr'],
                match: true,
              },
              { g: [{ str: 'my spouse' }], kapp: 6, pos: ['n'], match: true },
            ],
          },
          {
            k: [{ ent: '東', match: true }],
            r: [{ ent: 'トン', match: true }],
            s: [
              {
                g: [{ str: 'east wind tile' }],
                field: ['mahj'],
                pos: ['n'],
                match: true,
              },
              {
                g: [
                  {
                    str: 'winning hand with a pung (or kong) of east wind tiles',
                  },
                ],
                field: ['mahj'],
                pos: ['n'],
                match: true,
              },
            ],
          },
        ],
        more: false,
        matchLen: 1,
      },
    },
  },
  {
    description: "a word search result with the 'readingOnly' setting in place",
    queryResult: {
      words: {
        type: 'words',
        data: [
          {
            k: [{ ent: '韓国語', p: ['s1'], match: true }],
            r: [{ ent: 'かんこくご', p: ['s1'], a: 0, match: true }],
            s: [{ g: [{ str: 'Korean (language)' }], pos: ['n'], match: true }],
          },
          {
            k: [{ ent: '韓国', p: ['n1', 'nf01'], wk: 29, match: true }],
            r: [{ ent: 'かんこく', p: ['n1', 'nf01'], a: 0, match: true }],
            s: [
              {
                g: [{ str: 'South Korea' }, { str: 'Republic of Korea' }],
                pos: ['n', 'adj-no'],
                misc: ['abbr'],
                match: true,
              },
              {
                g: [{ str: 'Korean Empire (1897-1910)' }],
                pos: ['n', 'adj-no'],
                misc: ['abbr'],
                match: true,
              },
            ],
          },
          {
            k: [
              { ent: '唐国', match: false },
              { ent: '韓国', match: true },
            ],
            r: [{ ent: 'からくに', match: true }],
            s: [
              {
                g: [{ str: 'China' }, { str: 'Korea' }],
                pos: ['n'],
                misc: ['arch'],
                match: true,
              },
            ],
          },
          {
            k: [
              { ent: '唐', match: false },
              { ent: '韓', match: true },
              { ent: '漢', match: false },
            ],
            r: [{ ent: 'から', a: 1, match: true }],
            s: [
              {
                g: [
                  {
                    str: 'China (sometimes also used in ref. to Korea or other foreign countries)',
                  },
                ],
                pos: ['n', 'n-pref'],
                misc: ['arch'],
                match: true,
              },
            ],
          },
        ],
        more: false,
        matchLen: 3,
      },
    },
    extraConfig: { readingOnly: true },
  },
  {
    description: 'a word search result with mixed languages',
    queryResult: {
      words: {
        type: 'words',
        data: [
          {
            id: 1358280,
            k: [
              {
                ent: '食べる',
                p: ['i1', 'n2', 'nf25'],
                match: true,
                matchRange: [0, 3],
              },
              { ent: '喰べる', i: ['iK'], match: false },
            ],
            r: [{ ent: 'たべる', p: ['i1', 'n2', 'nf25'], a: 2, match: true }],
            s: [
              { g: [{ str: 'to eat' }], pos: ['v1', 'vt'], match: true },
              {
                g: [
                  { str: 'to live on (e.g. a salary)' },
                  { str: 'to live off' },
                  { str: 'to subsist on' },
                ],
                pos: ['v1', 'vt'],
                match: true,
              },
              { g: [{ str: 'manger' }], lang: 'fr', match: true },
              {
                g: [
                  { str: 'vivre avec (par ex. un salaire)' },
                  { str: 'vivre de (par ex. ses rentes)' },
                  { str: 'subsister grâce à' },
                ],
                lang: 'fr',
                match: true,
              },
            ],
          },
          {
            id: 1956480,
            k: [
              { ent: '食', p: ['n1', 'nf07'], match: true, matchRange: [0, 1] },
            ],
            r: [
              {
                ent: 'しょく',
                p: ['n1', 'nf07'],
                a: [{ i: 0 }, { i: 1 }],
                match: true,
              },
              { ent: 'じき', i: ['ok'], match: true },
              { ent: 'し', i: ['ok'], match: true },
            ],
            s: [
              {
                g: [{ str: 'food' }, { str: 'foodstuff' }],
                pos: ['n'],
                match: true,
              },
              {
                g: [{ str: 'eating' }, { str: 'appetite' }],
                pos: ['n'],
                rapp: 1,
                match: true,
              },
              { g: [{ str: 'meal' }], pos: ['n', 'ctr'], rapp: 1, match: true },
            ],
          },
          {
            id: 2837078,
            k: [
              { ent: '食', match: true, matchRange: [0, 1] },
              { ent: '蝕', match: false },
            ],
            r: [{ ent: 'しょく', a: [{ i: 0 }, { i: 1 }], match: true }],
            s: [
              {
                g: [{ str: 'eclipse (solar, lunar, etc.)' }],
                field: ['astron'],
                pos: ['n'],
                match: true,
              },
            ],
          },
        ],
        matchLen: 3,
        more: false,
      },
    },
  },
  {
    description: 'a translate result',
    queryResult: {
      words: {
        type: 'words',
        data: [
          {
            k: [{ ent: '韓国', p: ['n1', 'nf01'], wk: 29, match: true }],
            r: [{ ent: 'かんこく', p: ['n1', 'nf01'], a: 0, match: true }],
            s: [
              {
                g: [{ str: 'South Korea' }, { str: 'Republic of Korea' }],
                pos: ['n', 'adj-no'],
                misc: ['abbr'],
                match: true,
              },
              {
                g: [{ str: 'Korean Empire (1897-1910)' }],
                pos: ['n', 'adj-no'],
                misc: ['abbr'],
                match: true,
              },
            ],
          },
          {
            k: [{ ent: '中国', p: ['n1', 'nf01'], match: true }],
            r: [
              { ent: 'ちゅうごく', p: ['n1', 'nf01'], a: 0, match: true },
              { ent: 'ちゅうこく', match: true },
            ],
            s: [
              { g: [{ str: 'China' }], rapp: 1, pos: ['n'], match: true },
              {
                g: [
                  {
                    str: 'Chūgoku region of western Honshu (incl. Okayama, Hiroshima, Shimane, Tottori and Yamaguchi prefectures)',
                  },
                ],
                rapp: 1,
                pos: ['n'],
                misc: ['abbr'],
                match: true,
              },
              {
                g: [
                  { str: 'central part of a country' },
                  { str: 'main region' },
                ],
                pos: ['n'],
                rapp: 1,
                match: true,
              },
              {
                g: [
                  {
                    str: 'province of the second lowest rank (ritsuryo system)',
                  },
                ],
                pos: ['n'],
                match: true,
              },
            ],
          },
          {
            k: [{ ent: '殿', match: true }],
            r: [{ ent: 'との', a: 1, match: true }],
            s: [
              {
                g: [{ str: 'feudal lord' }],
                pos: ['n', 'pn'],
                misc: ['hon'],
                match: true,
              },
              {
                g: [{ str: 'mansion' }, { str: 'palace' }],
                pos: ['n'],
                misc: ['arch'],
                match: true,
              },
            ],
          },
          {
            k: [{ ent: '通貨スワップ', match: true }],
            r: [{ ent: 'つうかスワップ', match: true }],
            s: [{ g: [{ str: 'currency swap' }], pos: ['n'], match: true }],
          },
          {
            k: [{ ent: '延長', p: ['i1', 'n1', 'nf02'], match: true }],
            r: [
              { ent: 'えんちょう', p: ['i1', 'n1', 'nf02'], a: 0, match: true },
            ],
            s: [
              {
                g: [
                  { str: 'extension' },
                  { str: 'elongation' },
                  { str: 'prolongation' },
                  { str: 'lengthening' },
                ],
                pos: ['n', 'vs'],
                match: true,
              },
              {
                g: [{ str: 'Enchō era (923.4.11-931.4.26)' }],
                pos: ['n'],
                match: true,
              },
            ],
          },
          {
            k: [{ ent: '合意', p: ['i1', 'n1', 'nf01'], match: true }],
            r: [
              {
                ent: 'ごうい',
                p: ['i1', 'n1', 'nf01'],
                a: [{ i: 1 }, { i: 0 }],
                match: true,
              },
            ],
            s: [
              {
                g: [
                  { str: '(coming to an) agreement' },
                  { str: 'consent' },
                  { str: 'mutual understanding' },
                  { str: 'accord' },
                  { str: 'consensus' },
                ],
                pos: ['n', 'vs', 'adj-no'],
                match: true,
              },
            ],
          },
          {
            k: [],
            r: [{ ent: 'を', p: ['s1'], match: true }],
            s: [
              {
                g: [{ str: 'indicates direct object of action' }],
                pos: ['prt'],
                match: true,
              },
              {
                g: [{ str: 'indicates subject of causative expression' }],
                pos: ['prt'],
                match: true,
              },
              {
                g: [{ str: 'indicates an area traversed' }],
                pos: ['prt'],
                match: true,
              },
              {
                g: [
                  {
                    str: 'indicates time (period) over which action takes place',
                  },
                ],
                pos: ['prt'],
                match: true,
              },
              {
                g: [
                  {
                    str: 'indicates point of departure or separation of action',
                  },
                ],
                pos: ['prt'],
                match: true,
              },
              {
                g: [{ str: 'indicates object of desire, like, hate, etc.' }],
                pos: ['prt'],
                match: true,
              },
            ],
          },
        ],
        textLen: 18,
        more: true,
      },
      title: '韓国、中国との通貨スワップ延長合意を発表',
    },
  },
  {
    description: 'a name search result',
    queryResult: {
      names: {
        type: 'names',
        data: [
          {
            k: ['中野'],
            r: ['なかの'],
            tr: [{ type: ['place', 'surname'], det: ['Nakano'] }],
          },
          {
            k: ['中野'],
            r: ['なかのざき'],
            tr: [{ type: ['surname'], det: ['Nakanozaki'] }],
          },
          {
            k: ['中'],
            r: ['あたり'],
            tr: [{ type: ['fem', 'surname'], det: ['Atari'] }],
          },
        ],
        more: true,
        matchLen: 2,
      },
    },
  },
  /*
   * This no longer makes sense as a test now that we're not testing the parsing
   * of the entry here.
   */
  {
    description: 'a name search result with a nested definition',
    queryResult: {
      names: {
        type: 'names',
        data: [
          {
            k: ['あか組４'],
            r: ['あかぐみフォー'],
            tr: [{ type: ['person'], det: ['Akagumi Four'] }],
          },
        ],
        more: false,
        matchLen: 4,
      },
    },
  },
  {
    description: 'a name search result without a separate reading',
    queryResult: {
      names: {
        type: 'names',
        data: [{ r: ['あがさ'], tr: [{ type: ['fem'], det: ['Agasa'] }] }],
        more: false,
        matchLen: 3,
      },
    },
  },
  {
    description: 'a multicol name search result',
    queryResult: {
      names: {
        type: 'names',
        data: [
          {
            k: ['日本'],
            r: ['にっぽん'],
            tr: [{ type: ['surname'], det: ['Nippon'] }],
          },
          {
            k: ['日本'],
            r: ['につぽん'],
            tr: [{ type: ['surname'], det: ['Nitsupon'] }],
          },
          {
            k: ['日本'],
            r: ['にほん'],
            tr: [{ type: ['surname'], det: ['Nihon'] }],
          },
          {
            k: ['日本'],
            r: ['ひのもと'],
            tr: [{ type: ['surname'], det: ['Hinomoto'] }],
          },
          {
            k: ['日本'],
            r: ['ひもと'],
            tr: [{ type: ['unclass'], det: ['Himoto'] }],
          },
          {
            k: ['日本'],
            r: ['やまと'],
            tr: [{ type: ['surname'], det: ['Yamato'] }],
          },
          {
            k: ['日本'],
            r: ['やまとの'],
            tr: [{ type: ['surname'], det: ['Yamatono'] }],
          },
          {
            k: ['日'],
            r: ['あきら'],
            tr: [{ type: ['given'], det: ['Akira'] }],
          },
          {
            k: ['日'],
            r: ['くさなぎ'],
            tr: [{ type: ['surname'], det: ['Kusanagi'] }],
          },
          {
            k: ['日'],
            r: ['くさやなぎ'],
            tr: [{ type: ['surname'], det: ['Kusayanagi'] }],
          },
          { k: ['日'], r: ['じつ'], tr: [{ type: ['given'], det: ['Jitsu'] }] },
          {
            k: ['日'],
            r: ['たかにち'],
            tr: [{ type: ['surname'], det: ['Takanichi'] }],
          },
          {
            k: ['日'],
            r: ['たちもり'],
            tr: [{ type: ['surname'], det: ['Tachimori'] }],
          },
          { k: ['日'], r: ['にち'], tr: [{ type: ['place'], det: ['Nichi'] }] },
          {
            k: ['日'],
            r: ['にちれん'],
            tr: [{ type: ['unclass'], det: ['Nichiren'] }],
          },
          { k: ['日'], r: ['にっ'], tr: [{ type: ['place'], det: ['Ni'] }] },
          {
            k: ['日'],
            r: ['にっしゅう'],
            tr: [{ type: ['given'], det: ['Nisshuu'] }],
          },
          { k: ['日'], r: ['ひ'], tr: [{ type: ['place'], det: ['Hi'] }] },
          {
            k: ['日'],
            r: ['ひかる'],
            tr: [{ type: ['fem'], det: ['Hikaru'] }],
          },
          {
            k: ['日'],
            r: ['ひさき'],
            tr: [{ type: ['surname'], det: ['Hisaki'] }],
          },
        ],
        more: true,
        matchLen: 2,
        names: true,
      },
    },
  },
];
