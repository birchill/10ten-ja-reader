const htmlTests = [
  {
    description: 'a kanji entry',
    searchResult: {
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
    html:
      '<table class="k-main-tb"><tr><td valign="top"><table class="k-abox-tb"><tr><td class="k-abox-r">radical<br>士 33</td><td class="k-abox-g">grade<br>4</td></tr><tr><td class="k-abox-f">freq<br>526</td><td class="k-abox-s">strokes<br>3</td></tr></table><span class="k-kanji">士</span><br><div class="k-eigo">gentleman, samurai, samurai radical (no. 33)</div><div class="k-yomi">シ<br><span class="k-yomi-ti">名乗り</span> お、ま<br><span class="k-yomi-ti">部首名</span> さむらい</div></td></tr><tr><td><table class="k-mix-tb"><tr><td class="k-mix-td1">Halpern</td><td class="k-mix-td1">3405</td></tr><tr><td class="k-mix-td0">Heisig</td><td class="k-mix-td0">319</td></tr><tr><td class="k-mix-td1">Henshall</td><td class="k-mix-td1">494</td></tr><tr><td class="k-mix-td0">Kanji Learners Dictionary</td><td class="k-mix-td0">2129</td></tr><tr><td class="k-mix-td1">Nelson</td><td class="k-mix-td1">1160</td></tr><tr><td class="k-mix-td0">New Nelson</td><td class="k-mix-td0">1117</td></tr><tr><td class="k-mix-td1">PinYin</td><td class="k-mix-td1">shi4</td></tr><tr><td class="k-mix-td0">Skip Pattern</td><td class="k-mix-td0">4-3-2</td></tr><tr><td class="k-mix-td1">Tuttle Kanji &amp; Kana</td><td class="k-mix-td1">572</td></tr><tr><td class="k-mix-td0">Tuttle Kanji Dictionary</td><td class="k-mix-td0">3p0.1</td></tr><tr><td class="k-mix-td1">Unicode</td><td class="k-mix-td1">58EB</td></tr></table></td></tr></table>',
  },
  {
    description: 'a kanji entry with components',
    searchResult: {
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
    html:
      '<table class="k-main-tb"><tr><td valign="top"><table class="k-abox-tb"><tr><td class="k-abox-r">radical<br>魚 195</td><td class="k-abox-g">-</td></tr><tr><td class="k-abox-f">freq<br>-</td><td class="k-abox-s">strokes<br>19</td></tr></table><table class="k-bbox-tb"><tr><td class="k-bbox-1a">魚</td><td class="k-bbox-1b">うお</td><td class="k-bbox-1b">fish</td></tr><tr><td class="k-bbox-0a">二</td><td class="k-bbox-0b">に</td><td class="k-bbox-0b">two</td></tr><tr><td class="k-bbox-1a">亠</td><td class="k-bbox-1b">なべぶた</td><td class="k-bbox-1b">lid</td></tr><tr><td class="k-bbox-0a">土</td><td class="k-bbox-0b">つち</td><td class="k-bbox-0b">earth</td></tr><tr><td class="k-bbox-1a">月</td><td class="k-bbox-1b">つき</td><td class="k-bbox-1b">moon</td></tr><tr><td class="k-bbox-0a">田</td><td class="k-bbox-0b">た</td><td class="k-bbox-0b">rice field</td></tr><tr><td class="k-bbox-1a">青</td><td class="k-bbox-1b">あお</td><td class="k-bbox-1b">blue</td></tr><tr><td class="k-bbox-0a">灬</td><td class="k-bbox-0b">れっか</td><td class="k-bbox-0b">fire</td></tr></table><span class="k-kanji">鯖</span><br><div class="k-eigo">mackerel</div><div class="k-yomi">セイ、ショウ、さば</div></td></tr><tr><td><table class="k-mix-tb"><tr><td class="k-mix-td1">Halpern</td><td class="k-mix-td1">-</td></tr><tr><td class="k-mix-td0">Unicode</td><td class="k-mix-td0">9BD6</td></tr></table></td></tr></table>',
  },
  {
    description: 'a word search result',
    searchResult: {
      data: [
        [
          '走る [はしる] /(v5r,vi) to run/to travel (movement of vehicles)/to hurry to/to retreat (from battle)/to take flight/to run away from home/to elope/to tend heavily toward/(P)/',
          '< past',
        ],
      ],
      more: false,
      matchLen: 3,
    },
    html:
      '<span class="w-kanji">走る</span><span class="w-kana">はしる</span><span class="w-conj">(&lt; past)</span><br><span class="w-def">(v5r,vi) to run; to travel (movement of vehicles); to hurry to; to retreat (from battle); to take flight; to run away from home; to elope; to tend heavily toward; (P)</span><br>',
  },
  {
    description: 'a word search result with multiple entries',
    searchResult: {
      data: [
        ['韓国語 [かんこくご] /(n) Korean (language)/', null],
        ['韓国 [からくに] /(n,arch) China/Korea/', null],
        ['韓国 [かんこく] /(n) (South) Korea/', null],
      ],
      more: false,
      matchLen: 3,
    },
    html:
      '<span class="w-kanji">韓国語</span><span class="w-kana">かんこくご</span><br><span class="w-def">(n) Korean (language)</span><br><span class="w-kanji">韓国</span><span class="w-kana">からくに</span><br><span class="w-def">(n,arch) China; Korea</span><br><span class="w-kanji">韓国</span><span class="w-kana">かんこく</span><br><span class="w-def">(n) (South) Korea</span><br>',
  },
  {
    description: 'a word search result with overlapping entries',
    searchResult: {
      data: [
        ['東 [ひがし] /(n) east/(P)/', null],
        ['東 [ひむかし] /(n,ok) east/(P)/', null],
        ['東 [ひんがし] /(n,ok) east/(P)/', null],
        [
          '東 [あずま] /(n,arch,abbr) east/eastern Japan/six-stringed Japanese zither/my spouse/',
          null,
        ],
        [
          '東 [あづま] /(n,arch,abbr,ok) east/eastern Japan/six-stringed Japanese zither/my spouse/',
          null,
        ],
      ],
      more: false,
      matchLen: 1,
    },
    html:
      '<span class="w-kanji">東</span><span class="w-kana">ひがし</span><br><span class="w-def">(n) east; (P)</span><br><span class="w-kanji">東</span><span class="w-kana">ひむかし</span>、 <span class="w-kana">ひんがし</span><br><span class="w-def">(n,ok) east; (P)</span><br><span class="w-kanji">東</span><span class="w-kana">あずま</span><br><span class="w-def">(n,arch,abbr) east; eastern Japan; six-stringed Japanese zither; my spouse</span><br><span class="w-kanji">東</span><span class="w-kana">あづま</span><br><span class="w-def">(n,arch,abbr,ok) east; eastern Japan; six-stringed Japanese zither; my spouse</span><br>',
  },
  {
    description: "a word search result with the 'readingOnly' setting in place",
    searchResult: {
      data: [
        ['韓国語 [かんこくご] /(n) Korean (language)/', null],
        ['韓国 [からくに] /(n,arch) China/Korea/', null],
        ['韓国 [かんこく] /(n) (South) Korea/', null],
      ],
      more: false,
      matchLen: 3,
    },
    extraConfig: {
      readingOnly: true,
    },
    html:
      '<span class="w-kanji">韓国語</span><span class="w-kana">かんこくご</span><br><span class="w-kanji">韓国</span><span class="w-kana">からくに</span><br><span class="w-kanji">韓国</span><span class="w-kana">かんこく</span><br>',
  },
  {
    description: 'a translate result',
    searchResult: {
      data: [
        ['韓国 [からくに] /(n,arch) China/Korea/', null],
        [
          '中国 [ちゅうごく] /(n) China/South-west most region of Honshu/middle of a country/the Hiroshima area/',
          null,
        ],
        ['殿 [との] /(n) feudal lord/mansion/palace/', null],
        ['通貨 [つうか] /(n,adj-no) currency/(P)/', null],
        ['スワップ /(n,vs) swap/(P)/', null],
        [
          '延長 [えんちょう] /(n,vs) extension/elongation/prolongation/lengthening/Enchou era (923.4.11-931.4.26)/(P)/',
          null,
        ],
        [
          '合意 [ごうい] /(n,vs,adj-no) agreement/consent/mutual understanding/(P)/',
          null,
        ],
      ],
      textLen: 17,
      more: true,
      title: '韓国、中国との通貨スワップ延長合意を発表',
    },
    html:
      '<div class="w-title">韓国、中国との通貨スワップ延長合意を発表</div><span class="w-kanji">韓国</span><span class="w-kana">からくに</span><br><span class="w-def">(n,arch) China; Korea</span><br><span class="w-kanji">中国</span><span class="w-kana">ちゅうごく</span><br><span class="w-def">(n) China; South-west most region of Honshu; middle of a country; the Hiroshima area</span><br><span class="w-kanji">殿</span><span class="w-kana">との</span><br><span class="w-def">(n) feudal lord; mansion; palace</span><br><span class="w-kanji">通貨</span><span class="w-kana">つうか</span><br><span class="w-def">(n,adj-no) currency; (P)</span><br><span class="w-kana">スワップ</span><br><span class="w-def">(n,vs) swap; (P)</span><br><span class="w-kanji">延長</span><span class="w-kana">えんちょう</span><br><span class="w-def">(n,vs) extension; elongation; prolongation; lengthening; Enchou era (923.4.11-931.4.26); (P)</span><br><span class="w-kanji">合意</span><span class="w-kana">ごうい</span><br><span class="w-def">(n,vs,adj-no) agreement; consent; mutual understanding; (P)</span><br>...<br>',
  },
  {
    description: 'a name search result',
    searchResult: {
      data: [
        ['中野 [なかの] /Nakano (p,s)/', null],
        ['中野 [なかのざき] /Nakanozaki (s)/', null],
        ['中 [あたり] /Atari (f,s)/', null],
      ],
      more: true,
      matchLen: 2,
      names: true,
    },
    html:
      '<div class="w-title">Names Dictionary</div><table class="w-na-tb"><tr><td><span class="w-kanji">中野</span><span class="w-kana">なかの</span><br><span class="w-def">Nakano (p,s)</span><br><span class="w-kanji">中野</span><span class="w-kana">なかのざき</span><br><span class="w-def">Nakanozaki (s)</span><br><span class="w-kanji">中</span><span class="w-kana">あたり</span><br><span class="w-def">Atari (f,s)</span><br>...<br></td></tr></table>',
  },
  {
    description: 'a name search result with a nested definition',
    searchResult: {
      data: [['あか組４ [あかぐみふぉー] /あか組４ [あかぐみフォー] /Akagumi Four (h)//', null]],
      more: false,
      matchLen: 4,
      names: true,
    },
    html:
      '<div class="w-title">Names Dictionary</div><table class="w-na-tb"><tr><td><span class="w-kanji">あか組４</span><span class="w-kana">あかぐみフォー</span><br><span class="w-def">Akagumi Four (h)</span><br></td></tr></table>',
  },
  {
    description: 'a name search result without a separate reading',
    searchResult: {
      data: [['あがさ /Agasa (f)/', null]],
      more: false,
      matchLen: 3,
      names: true,
    },
    html:
      '<div class="w-title">Names Dictionary</div><table class="w-na-tb"><tr><td><span class="w-kana">あがさ</span><br><span class="w-def">Agasa (f)</span><br></td></tr></table>',
  },
];
