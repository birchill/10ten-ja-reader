import { getCombinedCharRange, getNegatedCharRange } from '../utils/char-range';

import { parseNumber } from './numbers';

export function lookForEra({
  currentText,
  nodeText,
  textDelimiter: originalTextDelimiter,
  textEnd,
}: {
  currentText: string;
  nodeText: string;
  textDelimiter: RegExp;
  textEnd: number;
}): {
  textDelimiter: RegExp;
  textEnd: number;
} | null {
  // We only want to _extend_ the current range so if `textEnd` is already -1
  // (i.e. end of the text) then we don't need to do anything.
  if (textEnd < 0 || !startsWithEraName(currentText)) {
    return null;
  }

  // The original text delimiter should include all the characters needed to
  // match Japanese years except spaces between the era and the year, and
  // spaces between the year and the final 年 character, if any.
  const japaneseOrSpace = getCombinedCharRange([
    getNegatedCharRange(originalTextDelimiter),
    /[\s]/,
  ]);
  const textDelimiter = getNegatedCharRange(japaneseOrSpace);

  const endOfEra = nodeText.substring(textEnd).search(textDelimiter);

  return {
    textDelimiter,
    textEnd: endOfEra === -1 ? -1 : textEnd + endOfEra,
  };
}

export function startsWithEraName(text: string): boolean {
  const maxEraLength = Math.max(
    ...Array.from(yearMap.keys()).map((key) => key.length)
  );

  for (let i = 1; i <= text.length && i <= maxEraLength; i++) {
    if (yearMap.has(text.substring(0, i))) {
      return true;
    }
  }

  return false;
}

export type EraInfo = {
  reading: string;
  start: number;
  yomi: string;
};

const yearMap = new Map<string, EraInfo>([
  ['大化', { reading: 'たいか', start: 645, yomi: 'Taika' }],
  ['白雉', { reading: 'はくち', start: 650, yomi: 'Hakuchi' }],
  ['朱鳥', { reading: 'しゅちょう', start: 686, yomi: 'Shuchō' }],
  ['大宝', { reading: 'たいほう', start: 701, yomi: 'Taihō' }],
  ['慶雲', { reading: 'けいうん', start: 704, yomi: 'Keiun' }],
  ['和銅', { reading: 'わどう', start: 708, yomi: 'Wadō' }],
  ['霊亀', { reading: 'れいき', start: 715, yomi: 'Reiki' }],
  ['養老', { reading: 'ようろう', start: 717, yomi: 'Yōrō' }],
  ['神亀', { reading: 'じんき', start: 724, yomi: 'Jinki' }],
  ['天平', { reading: 'てんぴょう', start: 729, yomi: 'Tempyō' }],
  [
    '天平感宝',
    { reading: 'てんぴょうかんぽう', start: 749, yomi: 'Tempyōkampō' },
  ],
  [
    '天平勝宝',
    { reading: 'てんぴょうしょうほう', start: 749, yomi: 'Tempyōshōhō' },
  ],
  [
    '天平宝字',
    { reading: 'てんぴょうじょうじ', start: 757, yomi: 'Tempyōjōji' },
  ],
  [
    '天平神護',
    { reading: 'てんぴょうじんご', start: 765, yomi: 'Tempyōjingo' },
  ],
  ['神護景雲', { reading: 'じんごけいうん', start: 767, yomi: 'Jingokeiun' }],
  ['宝亀', { reading: 'ほうき', start: 770, yomi: 'Hōki' }],
  ['天応', { reading: 'てんおう', start: 781, yomi: "Ten'ō" }],
  ['延暦', { reading: 'えんりゃく', start: 782, yomi: 'Enryaku' }],
  ['大同', { reading: 'だいどう', start: 806, yomi: 'Daidō' }],
  ['弘仁', { reading: 'こうにん', start: 810, yomi: 'Kōnin' }],
  ['天長', { reading: 'てんちょう', start: 823, yomi: 'Tenchō' }],
  ['承和', { reading: 'じょうわ', start: 834, yomi: 'Jōwa' }],
  ['嘉祥', { reading: 'かしょう', start: 848, yomi: 'Kashō' }],
  ['仁寿', { reading: 'にんじゅ', start: 851, yomi: 'Ninju' }],
  ['斉衡', { reading: 'さいこう', start: 855, yomi: 'Saikō' }],
  ['天安', { reading: 'てんあん', start: 857, yomi: "Ten'an" }],
  ['貞観', { reading: 'じょうがん', start: 859, yomi: 'Jōgan' }],
  ['元慶', { reading: 'がんぎょう', start: 877, yomi: 'Gangyō' }],
  ['仁和', { reading: 'にんな', start: 885, yomi: 'Ninna' }],
  ['寛平', { reading: 'かんぴょう', start: 889, yomi: 'Kampyō' }],
  ['昌泰', { reading: 'しょうたい', start: 898, yomi: 'Shōtai' }],
  ['延喜', { reading: 'えんぎ', start: 901, yomi: 'Engi' }],
  ['延長', { reading: 'えんちょう', start: 923, yomi: 'Enchō' }],
  ['承平', { reading: 'じょうへい', start: 931, yomi: 'Jōhei' }],
  ['天慶', { reading: 'てんぎょう', start: 938, yomi: 'Tengyō' }],
  ['天暦', { reading: 'てんりゃく', start: 947, yomi: 'Tenryaku' }],
  ['天徳', { reading: 'てんとく', start: 957, yomi: 'Tentoku' }],
  ['応和', { reading: 'おうわ', start: 961, yomi: 'Ōwa' }],
  ['康保', { reading: 'こうほう', start: 964, yomi: 'Kōhō' }],
  ['安和', { reading: 'あんな', start: 968, yomi: 'Anna' }],
  ['天禄', { reading: 'てんろく', start: 970, yomi: 'Tenroku' }],
  ['天延', { reading: 'てんえん', start: 974, yomi: "Ten'en" }],
  ['貞元', { reading: 'じょうげん', start: 976, yomi: 'Jōgen' }],
  ['天元', { reading: 'てんげん', start: 979, yomi: 'Tengen' }],
  ['永観', { reading: 'えいかん', start: 983, yomi: 'Eikan' }],
  ['寛和', { reading: 'かんな', start: 985, yomi: 'Kanna' }],
  ['永延', { reading: 'えいえん', start: 987, yomi: 'Eien' }],
  ['永祚', { reading: 'えいそ', start: 989, yomi: 'Eiso' }],
  ['正暦', { reading: 'しょうりゃく', start: 990, yomi: 'Shōryaku' }],
  ['長徳', { reading: 'ちょうとく', start: 995, yomi: 'Chōtoku' }],
  ['長保', { reading: 'ちょうほう', start: 999, yomi: 'Chōhō' }],
  ['寛弘', { reading: 'かんこう', start: 1004, yomi: 'Kankō' }],
  ['長和', { reading: 'ちょうわ', start: 1013, yomi: 'Chōwa' }],
  ['寛仁', { reading: 'かんにん', start: 1017, yomi: 'Kannin' }],
  ['治安', { reading: 'じあん', start: 1021, yomi: 'Jian' }],
  ['万寿', { reading: 'まんじゅ', start: 1024, yomi: 'Manju' }],
  ['長元', { reading: 'ちょうげん', start: 1028, yomi: 'Chōgen' }],
  ['長暦', { reading: 'ちょうりゃく', start: 1037, yomi: 'Chōryaku' }],
  ['長久', { reading: 'ちょうきゅう', start: 1040, yomi: 'Chōkyū' }],
  ['寛徳', { reading: 'かんとく', start: 1045, yomi: 'Kantoku' }],
  ['永承', { reading: 'えいしょう', start: 1046, yomi: 'Eishō' }],
  ['天喜', { reading: 'てんぎ', start: 1053, yomi: 'Tengi' }],
  ['康平', { reading: 'こうへい', start: 1058, yomi: 'Kōhei' }],
  ['治暦', { reading: 'じりゃく', start: 1065, yomi: 'Jiryaku' }],
  ['延久', { reading: 'えんきゅう', start: 1069, yomi: 'Enkyū' }],
  ['承保', { reading: 'じょうほう', start: 1074, yomi: 'Jōhō' }],
  ['承暦', { reading: 'じょうりゃく', start: 1078, yomi: 'Jōryaku' }],
  ['永保', { reading: 'えいほう', start: 1081, yomi: 'Eihō' }],
  ['応徳', { reading: 'おうとく', start: 1084, yomi: 'Ōtoku' }],
  ['寛治', { reading: 'かんじ', start: 1087, yomi: 'Kanji' }],
  ['嘉保', { reading: 'かほう', start: 1095, yomi: 'Kahō' }],
  ['永長', { reading: 'えいちょう', start: 1097, yomi: 'Eichō' }],
  ['承徳', { reading: 'じょうとく', start: 1098, yomi: 'Jōtoku' }],
  ['康和', { reading: 'こうわ', start: 1099, yomi: 'Kōwa' }],
  ['長治', { reading: 'ちょうじ', start: 1104, yomi: 'Chōji' }],
  ['嘉承', { reading: 'かじょう', start: 1106, yomi: 'Kajō' }],
  ['天仁', { reading: 'てんにん', start: 1108, yomi: 'Tennin' }],
  ['天永', { reading: 'てんねい', start: 1110, yomi: 'Tennei' }],
  ['永久', { reading: 'えいきゅう', start: 1113, yomi: 'Eikyū' }],
  ['元永', { reading: 'げんえい', start: 1118, yomi: "Gen'ei" }],
  ['保安', { reading: 'ほうあん', start: 1120, yomi: 'Hōan' }],
  ['天治', { reading: 'てんじ', start: 1124, yomi: 'Tenji' }],
  ['大治', { reading: 'だいじ', start: 1126, yomi: 'Daiji' }],
  ['天承', { reading: 'てんしょう', start: 1131, yomi: 'Tenshō' }],
  ['長承', { reading: 'ちょうしょう', start: 1132, yomi: 'Chōshō' }],
  ['保延', { reading: 'ほうえん', start: 1135, yomi: 'Hōen' }],
  ['永治', { reading: 'えいじ', start: 1141, yomi: 'Eiji' }],
  ['康治', { reading: 'こうじ', start: 1142, yomi: 'Kōji' }],
  ['天養', { reading: 'てんよう', start: 1144, yomi: "Ten'yō" }],
  ['久安', { reading: 'きゅうあん', start: 1145, yomi: 'Kyūan' }],
  ['仁平', { reading: 'にんぺい', start: 1151, yomi: 'Nimpei' }],
  ['久寿', { reading: 'きゅうじゅ', start: 1154, yomi: 'Kyūju' }],
  ['保元', { reading: 'ほうげん', start: 1156, yomi: 'Hōgen' }],
  ['平治', { reading: 'へいじ', start: 1159, yomi: 'Heiji' }],
  ['永暦', { reading: 'えいりゃく', start: 1160, yomi: 'Eiryaku' }],
  ['応保', { reading: 'おうほう', start: 1161, yomi: 'Ōhō' }],
  ['長寛', { reading: 'ちょうかん', start: 1163, yomi: 'Chōkan' }],
  ['永万', { reading: 'えいまん', start: 1165, yomi: 'Eiman' }],
  ['仁安', { reading: 'にんあん', start: 1166, yomi: "Nin'an" }],
  ['嘉応', { reading: 'かおう', start: 1169, yomi: 'Kaō' }],
  ['承安', { reading: 'しょうあん', start: 1171, yomi: 'Shōan' }],
  ['安元', { reading: 'あんげん', start: 1175, yomi: 'Angen' }],
  ['治承', { reading: 'じしょう', start: 1177, yomi: 'Jishō' }],
  ['養和', { reading: 'ようわ', start: 1181, yomi: 'Yōwa' }],
  ['寿永', { reading: 'じゅえい', start: 1182, yomi: 'Juei' }],
  ['元暦', { reading: 'げんりゃく', start: 1184, yomi: 'Genryaku' }],
  ['文治', { reading: 'ぶんじ', start: 1185, yomi: 'Bunji' }],
  ['建久', { reading: 'けんきゅう', start: 1190, yomi: 'Kenkyū' }],
  ['正治', { reading: 'しょうじ', start: 1199, yomi: 'Shōji' }],
  ['建仁', { reading: 'けんにん', start: 1201, yomi: 'Kennin' }],
  ['元久', { reading: 'げんきゅう', start: 1204, yomi: 'Genkyū' }],
  ['建永', { reading: 'けんえい', start: 1206, yomi: "Ken'ei" }],
  ['承元', { reading: 'じょうげん', start: 1207, yomi: 'Jōgen' }],
  ['建暦', { reading: 'けんりゃく', start: 1211, yomi: 'Kenryaku' }],
  ['建保', { reading: 'けんぽう', start: 1214, yomi: 'Kempō' }],
  ['承久', { reading: 'じょうきゅう', start: 1219, yomi: 'Jōkyū' }],
  ['貞応', { reading: 'じょうおう', start: 1222, yomi: 'Jōō' }],
  ['元仁', { reading: 'げんにん', start: 1225, yomi: 'Gennin' }],
  ['嘉禄', { reading: 'かろく', start: 1225, yomi: 'Karoku' }],
  ['安貞', { reading: 'あんてい', start: 1228, yomi: 'Antei' }],
  ['寛喜', { reading: 'かんき', start: 1229, yomi: 'Kanki' }],
  ['貞永', { reading: 'じょうえい', start: 1232, yomi: 'Jōei' }],
  ['天福', { reading: 'てんぷく', start: 1233, yomi: 'Tempuku' }],
  ['文暦', { reading: 'ぶんりゃく', start: 1235, yomi: 'Bunryaku' }],
  ['嘉禎', { reading: 'かてい', start: 1235, yomi: 'Katei' }],
  ['暦仁', { reading: 'りゃくにん', start: 1239, yomi: 'Ryakunin' }],
  ['延応', { reading: 'えんおう', start: 1239, yomi: "En'ō" }],
  ['仁治', { reading: 'にんじ', start: 1240, yomi: 'Ninji' }],
  ['寛元', { reading: 'かんげん', start: 1243, yomi: 'Kangen' }],
  ['宝治', { reading: 'ほうじ', start: 1247, yomi: 'Hōji' }],
  ['建長', { reading: 'けんちょう', start: 1249, yomi: 'Kenchō' }],
  ['康元', { reading: 'こうげん', start: 1256, yomi: 'Kōgen' }],
  ['正嘉', { reading: 'しょうか', start: 1257, yomi: 'Shōka' }],
  ['正元', { reading: 'しょうげん', start: 1259, yomi: 'Shōgen' }],
  ['文応', { reading: 'ぶんおう', start: 1260, yomi: "Bun'ō" }],
  ['弘長', { reading: 'こうちょう', start: 1261, yomi: 'Kōchō' }],
  ['文永', { reading: 'ぶんえい', start: 1264, yomi: "Bun'ei" }],
  ['健治', { reading: 'けんじ', start: 1275, yomi: 'Kenji' }],
  ['弘安', { reading: 'こうあん', start: 1278, yomi: 'Kōan' }],
  ['正応', { reading: 'しょうおう', start: 1288, yomi: 'Shōō' }],
  ['永仁', { reading: 'えいにん', start: 1293, yomi: 'Einin' }],
  ['正安', { reading: 'しょうあん', start: 1299, yomi: 'Shōan' }],
  ['乾元', { reading: 'けんげん', start: 1303, yomi: 'Kengen' }],
  ['嘉元', { reading: 'かげん', start: 1303, yomi: 'Kagen' }],
  ['徳治', { reading: 'とくじ', start: 1307, yomi: 'Tokuji' }],
  ['延慶', { reading: 'えんきょう', start: 1308, yomi: 'Enkyō' }],
  ['応長', { reading: 'おうちょう', start: 1311, yomi: 'Ōchō' }],
  ['正和', { reading: 'しょうわ', start: 1312, yomi: 'Shōwa' }],
  ['文保', { reading: 'ぶんぽう', start: 1317, yomi: 'Bumpō' }],
  ['元応', { reading: 'げんおう', start: 1319, yomi: "Gen'ō" }],
  ['元亨', { reading: 'げんこう', start: 1321, yomi: 'Genkō' }],
  ['正中', { reading: 'しょうちゅ', start: 1325, yomi: 'Shōchu' }],
  ['嘉暦', { reading: 'かりゃく', start: 1326, yomi: 'Karyaku' }],
  ['元徳', { reading: 'げんとく', start: 1329, yomi: 'Gentoku' }],
  ['元弘', { reading: 'げんこう', start: 1331, yomi: 'Genkō (Southern)' }],
  ['正慶', { reading: 'しょうけい', start: 1332, yomi: 'Shōkei' }],
  ['建武', { reading: 'けんむ', start: 1334, yomi: 'Kemmu (Southern)' }],
  ['延元', { reading: 'えいげん', start: 1336, yomi: 'Eigen (Southern)' }],
  ['暦応', { reading: 'りゃくおう', start: 1338, yomi: 'Ryakuō' }],
  ['興国', { reading: 'こうこく', start: 1340, yomi: 'Kōkoku (Southern)' }],
  ['康永', { reading: 'こうえい', start: 1342, yomi: 'Kōei' }],
  ['貞和', { reading: 'じょうわ', start: 1345, yomi: 'Jōwa' }],
  ['正平', { reading: 'しょうへい', start: 1347, yomi: 'Shōhei (Southern)' }],
  ['観応', { reading: 'かんおう', start: 1350, yomi: "Kan'ō" }],
  ['文和', { reading: 'ぶんな', start: 1352, yomi: 'Bunna' }],
  ['延文', { reading: 'えんぶん', start: 1356, yomi: 'Embun' }],
  ['康安', { reading: 'こうあん', start: 1361, yomi: 'Kōan' }],
  ['貞治', { reading: 'じょうじ', start: 1362, yomi: 'Jōji' }],
  ['応安', { reading: 'おうあん', start: 1368, yomi: 'Ōan' }],
  ['建徳', { reading: 'けんとく', start: 1370, yomi: 'Kentoku (Southern)' }],
  ['文中', { reading: 'ぶんちゅう', start: 1372, yomi: 'Bunchū (Southern)' }],
  ['永和', { reading: 'えいわ', start: 1375, yomi: 'Eiwa' }],
  ['天授', { reading: 'てんじゅ', start: 1375, yomi: 'Tenju (Southern)' }],
  ['康暦', { reading: 'こうりゃく', start: 1379, yomi: 'Kōryaku' }],
  ['永徳', { reading: 'えいとく', start: 1381, yomi: 'Eitoku' }],
  ['弘和', { reading: 'こうわ', start: 1381, yomi: 'Kōwa (Southern)' }],
  ['至徳', { reading: 'しとく', start: 1384, yomi: 'Shitoku' }],
  ['元中', { reading: 'げんちゅう', start: 1384, yomi: 'Genchū (Southern)' }],
  ['嘉慶', { reading: 'かけい', start: 1387, yomi: 'Kakei' }],
  ['康応', { reading: 'こうおう', start: 1389, yomi: 'Kōō' }],
  ['明徳', { reading: 'めいとく', start: 1390, yomi: 'Meitoku' }],
  ['応永', { reading: 'おうえい', start: 1394, yomi: 'Ōei' }],
  ['正長', { reading: 'しょうちょう', start: 1428, yomi: 'Shōchō' }],
  ['永享', { reading: 'えいきょう', start: 1429, yomi: 'Eikyō' }],
  ['嘉吉', { reading: 'かきつ', start: 1441, yomi: 'Kakitsu' }],
  ['文安', { reading: 'ぶんあん', start: 1444, yomi: "Bun'an" }],
  ['宝徳', { reading: 'ほうとく', start: 1449, yomi: 'Hōtoku' }],
  ['享徳', { reading: 'きょうとく', start: 1452, yomi: 'Kyōtoku' }],
  ['康正', { reading: 'こうしょう', start: 1455, yomi: 'Kōshō' }],
  ['長禄', { reading: 'ちょうろく', start: 1457, yomi: 'Chōroku' }],
  ['寛正', { reading: 'かんしょう', start: 1461, yomi: 'Kanshō' }],
  ['文正', { reading: 'ぶんしょう', start: 1466, yomi: 'Bunshō' }],
  ['応仁', { reading: 'おうにん', start: 1467, yomi: 'Ōnin' }],
  ['文明', { reading: 'ぶんめい', start: 1469, yomi: 'Bummei' }],
  ['長享', { reading: 'ちょうきょう', start: 1487, yomi: 'Chōkyō' }],
  ['延徳', { reading: 'えんとく', start: 1489, yomi: 'Entoku' }],
  ['明応', { reading: 'めいおう', start: 1492, yomi: 'Meiō' }],
  ['文亀', { reading: 'ぶんき', start: 1501, yomi: 'Bunki' }],
  ['永正', { reading: 'えいしょう', start: 1504, yomi: 'Eishō' }],
  ['大永', { reading: 'だいえい', start: 1521, yomi: 'Daiei' }],
  ['享禄', { reading: 'きょうろく', start: 1528, yomi: 'Kyōroku' }],
  ['天文', { reading: 'てんぶん', start: 1532, yomi: 'Tembun' }],
  ['弘治', { reading: 'こうじ', start: 1555, yomi: 'Kōji' }],
  ['永禄', { reading: 'えいろく', start: 1558, yomi: 'Eiroku' }],
  ['元亀', { reading: 'げんき', start: 1570, yomi: 'Genki' }],
  ['天正', { reading: 'てんしょう', start: 1573, yomi: 'Tenshō' }],
  ['文禄', { reading: 'ぶんろく', start: 1593, yomi: 'Bunroku' }],
  ['慶長', { reading: 'けいちょう', start: 1596, yomi: 'Keichō' }],
  ['元和', { reading: 'げんな', start: 1615, yomi: 'Genna' }],
  ['寛永', { reading: 'かんえい', start: 1624, yomi: "Kan'ei" }],
  ['正保', { reading: 'しょうほう', start: 1645, yomi: 'Shōhō' }],
  ['慶安', { reading: 'けいあん', start: 1648, yomi: 'Keian' }],
  ['承応', { reading: 'じょうおう', start: 1652, yomi: 'Jōō' }],
  ['明暦', { reading: 'めいれき', start: 1655, yomi: 'Meireki' }],
  ['万治', { reading: 'まんじ', start: 1658, yomi: 'Manji' }],
  ['寛文', { reading: 'かんぶん', start: 1661, yomi: 'Kambun' }],
  ['延宝', { reading: 'えんぽう', start: 1673, yomi: 'Empō' }],
  ['天和', { reading: 'てんな', start: 1681, yomi: 'Tenna' }],
  ['貞享', { reading: 'じょうきょう', start: 1684, yomi: 'Jōkyō' }],
  ['元禄', { reading: 'げんろく', start: 1688, yomi: 'Genroku' }],
  ['宝永', { reading: 'ほうえい', start: 1704, yomi: 'Hōei' }],
  ['正徳', { reading: 'しょうとく', start: 1711, yomi: 'Shōtoku' }],
  ['享保', { reading: 'きょうほう', start: 1716, yomi: 'Kyōhō' }],
  ['元文', { reading: 'げんぶん', start: 1736, yomi: 'Gembun' }],
  ['寛保', { reading: 'かんぽう', start: 1741, yomi: 'Kampō' }],
  ['延享', { reading: 'えんきょう', start: 1744, yomi: 'Enkyō' }],
  ['寛延', { reading: 'かんえん', start: 1748, yomi: "Kan'en" }],
  ['宝暦', { reading: 'ほうれき', start: 1751, yomi: 'Hōreki' }],
  ['明和', { reading: 'めいわ', start: 1764, yomi: 'Meiwa' }],
  ['安永', { reading: 'あんえい', start: 1773, yomi: "An'ei" }],
  ['天明', { reading: 'てんめい', start: 1781, yomi: 'Temmei' }],
  ['寛政', { reading: 'かんせい', start: 1801, yomi: 'Kansei' }],
  ['享和', { reading: 'きょうわ', start: 1802, yomi: 'Kyōwa' }],
  ['文化', { reading: 'ぶんか', start: 1804, yomi: 'Bunka' }],
  ['文政', { reading: 'ぶんせい', start: 1818, yomi: 'Bunsei' }],
  ['天保', { reading: 'てんぽう', start: 1831, yomi: 'Tempō' }],
  ['弘化', { reading: 'こうか', start: 1845, yomi: 'Kōka' }],
  ['嘉永', { reading: 'かえい', start: 1848, yomi: 'Kaei' }],
  ['安政', { reading: 'あんせい', start: 1855, yomi: 'Ansei' }],
  ['万延', { reading: 'まんえい', start: 1860, yomi: "Man'ei" }],
  ['文久', { reading: 'ぶんきゅう', start: 1861, yomi: 'Bunkyū' }],
  ['元治', { reading: 'げんじ', start: 1864, yomi: 'Genji' }],
  ['慶応', { reading: 'けいおう', start: 1865, yomi: 'Keiō' }],
  ['明治', { reading: 'めいじ', start: 1868, yomi: 'Meiji' }],
  ['㍾', { reading: 'めいじ', start: 1868, yomi: 'Meiji' }],
  ['大正', { reading: 'たいしょう', start: 1912, yomi: 'Taishō' }],
  ['㍽', { reading: 'たいしょう', start: 1912, yomi: 'Taishō' }],
  ['昭和', { reading: 'しょうわ', start: 1926, yomi: 'Shōwa' }],
  ['㍼', { reading: 'しょうわ', start: 1926, yomi: 'Shōwa' }],
  ['平成', { reading: 'へいせい', start: 1989, yomi: 'Heisei' }],
  ['㍻', { reading: 'へいせい', start: 1989, yomi: 'Heisei' }],
  ['令和', { reading: 'れいわ', start: 2019, yomi: 'Reiwa' }],
  ['㋿', { reading: 'れいわ', start: 2019, yomi: 'Reiwa' }],
]);

export type EraMeta = {
  type: 'era';
  era: string;
  // 0 here represents that the matched text used 元年 (equivalent to 1 but we
  // might want to display it differently).
  year: number;
  // The length of the text that matched
  matchLen: number;
};

// This is a bit complicated because for a numeric year we don't require the
// 年 but for 元年 we do. i.e. '令和2' is valid but '令和元' is not.
const yearRegex = /(?:([0-9０-９〇一二三四五六七八九十百]+)\s*年?|(?:元\s*年))/;

export function extractEraMetadata(text: string): EraMeta | undefined {
  // Look for a year
  const matches = yearRegex.exec(text);
  if (!matches || matches.index === 0) {
    return undefined;
  }

  // Look for an era
  const era = text.substring(0, matches.index).trim();
  if (!isEraName(era)) {
    return undefined;
  }

  // Parse year
  let year: number | null = 0;
  if (typeof matches[1] !== 'undefined') {
    year = parseNumber(matches[1]);
  }

  if (year === null) {
    return undefined;
  }

  const matchLen = matches.index + matches[0].length;

  return { type: 'era', era, year, matchLen };
}

function isEraName(text: string): boolean {
  return yearMap.has(text);
}

export function getEraInfo(text: string): EraInfo | undefined {
  return yearMap.get(text);
}
