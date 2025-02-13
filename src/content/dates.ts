import browser from 'webextension-polyfill';

import { BackgroundRequest } from '../background/background-request';
import { getCombinedCharRange, getNegatedCharRange } from '../utils/char-range';

import { parseNumber } from './numbers';

const preGregorianEras = new Map<string, string>([
  ['大宝', 'たいほう'],
  ['慶雲', 'けいうん'],
  ['和銅', 'わどう'],
  ['霊亀', 'れいき'],
  ['養老', 'ようろう'],
  ['神亀', 'じんき'],
  ['天平', 'てんぴょう'],
  ['天平感宝', 'てんぴょうかんぽう'],
  ['天平勝宝', 'てんぴょうしょうほう'],
  ['天平宝字', 'てんぴょうじょうじ'],
  ['天平神護', 'てんぴょうじんご'],
  ['神護景雲', 'じんごけいうん'],
  ['宝亀', 'ほうき'],
  ['天応', 'てんおう'],
  ['延暦', 'えんりゃく'],
  ['大同', 'だいどう'],
  ['弘仁', 'こうにん'],
  ['天長', 'てんちょう'],
  ['承和', 'じょうわ'],
  ['嘉祥', 'かしょう'],
  ['仁寿', 'にんじゅ'],
  ['斉衡', 'さいこう'],
  ['天安', 'てんあん'],
  ['貞観', 'じょうがん'],
  ['元慶', 'がんぎょう'],
  ['仁和', 'にんな'],
  ['寛平', 'かんぴょう'],
  ['昌泰', 'しょうたい'],
  ['延喜', 'えんぎ'],
  ['延長', 'えんちょう'],
  ['承平', 'じょうへい'],
  ['天慶', 'てんぎょう'],
  ['天暦', 'てんりゃく'],
  ['天徳', 'てんとく'],
  ['応和', 'おうわ'],
  ['康保', 'こうほう'],
  ['安和', 'あんな'],
  ['天禄', 'てんろく'],
  ['天延', 'てんえん'],
  ['貞元', 'じょうげん'],
  ['天元', 'てんげん'],
  ['永観', 'えいかん'],
  ['寛和', 'かんな'],
  ['永延', 'えいえん'],
  ['永祚', 'えいそ'],
  ['正暦', 'しょうりゃく'],
  ['長徳', 'ちょうとく'],
  ['長保', 'ちょうほう'],
  ['寛弘', 'かんこう'],
  ['長和', 'ちょうわ'],
  ['寛仁', 'かんにん'],
  ['治安', 'じあん'],
  ['万寿', 'まんじゅ'],
  ['長元', 'ちょうげん'],
  ['長暦', 'ちょうりゃく'],
  ['長久', 'ちょうきゅう'],
  ['寛徳', 'かんとく'],
  ['永承', 'えいしょう'],
  ['天喜', 'てんぎ'],
  ['康平', 'こうへい'],
  ['治暦', 'じりゃく'],
  ['延久', 'えんきゅう'],
  ['承保', 'じょうほう'],
  ['承暦', 'じょうりゃく'],
  ['永保', 'えいほう'],
  ['応徳', 'おうとく'],
  ['寛治', 'かんじ'],
  ['嘉保', 'かほう'],
  ['永長', 'えいちょう'],
  ['承徳', 'じょうとく'],
  ['康和', 'こうわ'],
  ['長治', 'ちょうじ'],
  ['嘉承', 'かじょう'],
  ['天仁', 'てんにん'],
  ['天永', 'てんねい'],
  ['永久', 'えいきゅう'],
  ['元永', 'げんえい'],
  ['保安', 'ほうあん'],
  ['天治', 'てんじ'],
  ['大治', 'だいじ'],
  ['天承', 'てんしょう'],
  ['長承', 'ちょうしょう'],
  ['保延', 'ほうえん'],
  ['永治', 'えいじ'],
  ['康治', 'こうじ'],
  ['天養', 'てんよう'],
  ['久安', 'きゅうあん'],
  ['仁平', 'にんぺい'],
  ['久寿', 'きゅうじゅ'],
  ['保元', 'ほうげん'],
  ['平治', 'へいじ'],
  ['永暦', 'えいりゃく'],
  ['応保', 'おうほう'],
  ['長寛', 'ちょうかん'],
  ['永万', 'えいまん'],
  ['仁安', 'にんあん'],
  ['嘉応', 'かおう'],
  ['承安', 'しょうあん'],
  ['安元', 'あんげん'],
  ['治承', 'じしょう'],
  ['養和', 'ようわ'],
  ['寿永', 'じゅえい'],
  ['元暦', 'げんりゃく'],
  ['文治', 'ぶんじ'],
  ['建久', 'けんきゅう'],
  ['正治', 'しょうじ'],
  ['建仁', 'けんにん'],
  ['元久', 'げんきゅう'],
  ['建永', 'けんえい'],
  ['承元', 'じょうげん'],
  ['建暦', 'けんりゃく'],
  ['建保', 'けんぽう'],
  ['承久', 'じょうきゅう'],
  ['貞応', 'じょうおう'],
  ['元仁', 'げんにん'],
  ['嘉禄', 'かろく'],
  ['安貞', 'あんてい'],
  ['寛喜', 'かんき'],
  ['貞永', 'じょうえい'],
  ['天福', 'てんぷく'],
  ['文暦', 'ぶんりゃく'],
  ['嘉禎', 'かてい'],
  ['暦仁', 'りゃくにん'],
  ['延応', 'えんおう'],
  ['仁治', 'にんじ'],
  ['寛元', 'かんげん'],
  ['宝治', 'ほうじ'],
  ['建長', 'けんちょう'],
  ['康元', 'こうげん'],
  ['正嘉', 'しょうか'],
  ['正元', 'しょうげん'],
  ['文応', 'ぶんおう'],
  ['弘長', 'こうちょう'],
  ['文永', 'ぶんえい'],
  ['建治', 'けんじ'],
  ['弘安', 'こうあん'],
  ['正応', 'しょうおう'],
  ['永仁', 'えいにん'],
  ['正安', 'しょうあん'],
  ['乾元', 'けんげん'],
  ['嘉元', 'かげん'],
  ['徳治', 'とくじ'],
  ['延慶', 'えんきょう'],
  ['応長', 'おうちょう'],
  ['正和', 'しょうわ'],
  ['文保', 'ぶんぽう'],
  ['元応', 'げんおう'],
  ['元亨', 'げんこう'],
  ['正中', 'しょうちゅ'],
  ['嘉暦', 'かりゃく'],
  ['元徳', 'げんとく'],
  ['元弘', 'げんこう'],
  ['正慶', 'しょうけい'],
  ['建武', 'けんむ'],
  ['延元', 'えいげん'],
  ['興国', 'こうこく'],
  ['正平', 'しょうへい'],
  ['暦応', 'りゃくおう'],
  ['康永', 'こうえい'],
  ['貞和', 'じょうわ'],
  ['観応', 'かんおう'],
  ['建徳', 'けんとく'],
  ['文中', 'ぶんちゅう'],
  ['天授', 'てんじゅ'],
  ['弘和', 'こうわ'],
  ['元中', 'げんちゅう'],
  ['文和', 'ぶんな'],
  ['延文', 'えんぶん'],
  ['康安', 'こうあん'],
  ['貞治', 'じょうじ'],
  ['応安', 'おうあん'],
  ['永和', 'えいわ'],
  ['康暦', 'こうりゃく'],
  ['永徳', 'えいとく'],
  ['至徳', 'しとく'],
  ['嘉慶', 'かけい'],
  ['康応', 'こうおう'],
  ['明徳', 'めいとく'],
  ['応永', 'おうえい'],
  ['正長', 'しょうちょう'],
  ['永享', 'えいきょう'],
  ['嘉吉', 'かきつ'],
  ['文安', 'ぶんあん'],
  ['宝徳', 'ほうとく'],
  ['享徳', 'きょうとく'],
  ['康正', 'こうしょう'],
  ['長禄', 'ちょうろく'],
  ['寛正', 'かんしょう'],
  ['文正', 'ぶんしょう'],
  ['応仁', 'おうにん'],
  ['文明', 'ぶんめい'],
  ['長享', 'ちょうきょう'],
  ['延徳', 'えんとく'],
  ['明応', 'めいおう'],
  ['文亀', 'ぶんき'],
  ['永正', 'えいしょう'],
  ['大永', 'だいえい'],
  ['享禄', 'きょうろく'],
  ['天文', 'てんぶん'],
  ['弘治', 'こうじ'],
  ['永禄', 'えいろく'],
  ['元亀', 'げんき'],
  ['天正', 'てんしょう'],
  ['文禄', 'ぶんろく'],
  ['慶長', 'けいちょう'],
  ['元和', 'げんな'],
  ['寛永', 'かんえい'],
  ['正保', 'しょうほう'],
  ['慶安', 'けいあん'],
  ['承応', 'じょうおう'],
  ['明暦', 'めいれき'],
  ['万治', 'まんじ'],
  ['寛文', 'かんぶん'],
  ['延宝', 'えんぽう'],
  ['天和', 'てんな'],
  ['貞享', 'じょうきょう'],
  ['元禄', 'げんろく'],
  ['宝永', 'ほうえい'],
  ['正徳', 'しょうとく'],
  ['享保', 'きょうほう'],
  ['元文', 'げんぶん'],
  ['寛保', 'かんぽう'],
  ['延享', 'えんきょう'],
  ['寛延', 'かんえん'],
  ['宝暦', 'ほうれき'],
  ['明和', 'めいわ'],
  ['安永', 'あんえい'],
  ['天明', 'てんめい'],
  ['寛政', 'かんせい'],
  ['享和', 'きょうわ'],
  ['文化', 'ぶんか'],
  ['文政', 'ぶんせい'],
  ['天保', 'てんぽう'],
  ['弘化', 'こうか'],
  ['嘉永', 'かえい'],
  ['安政', 'あんせい'],
  ['万延', 'まんえい'],
  ['文久', 'ぶんきゅう'],
  ['元治', 'げんじ'],
  ['慶応', 'けいおう'],
  ['明治', 'めいじ'],
]);

type GregorianEraInfo = { reading: string; start: number };

const gregorianEras: Record<string, GregorianEraInfo> = {
  // --------------------------------------------------------------
  // The following entries are not eras when the Gregorian calendar
  // was in use. However, since we lack date conversion data for
  // these periods, we treat them as if they were Gregorian eras
  // to get basic year offset calculation support.
  大化: { reading: 'たいか', start: 645 },
  白雉: { reading: 'はくち', start: 650 },
  朱鳥: { reading: 'しゅちょう', start: 686 },
  // --------------------------------------------------------------

  明治: { reading: 'めいじ', start: 1868 },
  大正: { reading: 'たいしょう', start: 1912 },
  昭和: { reading: 'しょうわ', start: 1926 },
  平成: { reading: 'へいせい', start: 1989 },
  令和: { reading: 'れいわ', start: 2019 },
};

const eraAliases: Record<string, string> = {
  '㍾': '明治',
  '㍽': '大正',
  '㍼': '昭和',
  '㍻': '平成',
  '㋿': '令和',
};

const maxEraLength = Math.max(
  ...[
    ...Object.keys(eraAliases),
    ...Object.keys(gregorianEras),
    ...preGregorianEras.keys(),
  ].map((key) => key.length)
);

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
}): { textDelimiter: RegExp; textEnd: number } | null {
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

  return { textDelimiter, textEnd: endOfEra === -1 ? -1 : textEnd + endOfEra };
}

export function startsWithEraName(text: string): boolean {
  for (let i = 1; i <= text.length && i <= maxEraLength; i++) {
    if (isEraName(text.substring(0, i))) {
      return true;
    }
  }

  return false;
}

export type EraMeta = {
  type: 'era';
  era: string;
  reading?: string;
  // 0 here represents that the matched text used 元年 (equivalent to 1 but we
  // might want to display it differently).
  year: number;
  month?: number;
  day?: number;
  // The length of the text that matched
  matchLen: number;
};

export function extractEraMetadata(text: string): EraMeta | undefined {
  const parsedDate = parseEraDate(text);

  if (!parsedDate) {
    return undefined;
  }

  const era = parsedDate.era;

  return {
    type: 'era',
    era,
    reading: gregorianEras[era]?.reading || preGregorianEras.get(era),
    year: parsedDate.year,
    month: parsedDate.month,
    day: parsedDate.day,
    matchLen: parsedDate.matchLength,
  };
}

function isEraName(text: string): boolean {
  return (
    text in eraAliases || text in gregorianEras || preGregorianEras.has(text)
  );
}

function isGregorianYear(era: string, year: number): boolean {
  if (era in gregorianEras) {
    if (era === '明治' && year < 6) {
      // This was before 1873, when the Chinese calendar was still in use.
      return false;
    }
    return true;
  }
  return false;
}

export type EraInfoDate = { year: number; month?: number; day?: number };

export type EraInfoTimeSpan = { dateStart: EraInfoDate; dateEnd?: EraInfoDate };

export async function getEraInfoTimeSpan(
  meta: EraMeta
): Promise<EraInfoTimeSpan | undefined> {
  // When parsing 元年, the year is represented as 0 in EraMeta, but it refers to
  // the first year. We need to adjust this in our calculations.
  const year = Math.max(meta.year, 1);

  if (isGregorianYear(meta.era, year)) {
    const eraInfo = gregorianEras[meta.era];

    const gregorianYear = eraInfo.start + year - 1;
    const date = { year: gregorianYear, month: meta.month, day: meta.day };

    return { dateStart: date };
  }

  const message: BackgroundRequest = {
    ...meta,
    year,
    type: 'calculateEraDateTimeSpan',
  };

  try {
    return await browser.runtime.sendMessage<
      BackgroundRequest,
      EraInfoTimeSpan
    >(message);
  } catch (e) {
    console.error(
      '[10ten-ja-reader] Failed to call calculateEraDateTimeSpan. The page might need to be refreshed.',
      e
    );
    return undefined;
  }
}

type ParsedEraDate = {
  era: string;
  year: number;
  month?: number;
  day?: number;

  matchLength: number;
};

export function parseEraDate(text: string): ParsedEraDate | undefined {
  const numerals = '0-9０-９〇一二三四五六七八九十百';

  // This is a bit complicated because for a numeric year we don't require the
  // 年 but for 元年 we do. i.e. '令和2' is valid but '令和元' is not.
  // Furthermore, 年 can be written as 歳.
  const yearRegex = String.raw`(?:([${numerals}]+\s*(?:年|歳)?)|(元\s*(?:年|歳)))`;
  // 閏 marks an intercalary / leap month.
  const monthRegex = String.raw`\s*(閏?\s*[${numerals}]+)\s*月`;
  const dayRegex = String.raw`\s*([${numerals}]+)\s*日`;

  // 'g' flag needs to be set in order for the `lastIndex` property to represent
  // the matched length after the exec() call.
  // Month and day are optional.
  const fullRegex = new RegExp(
    `${yearRegex}(?:${monthRegex}(?:${dayRegex})?)?`,
    'g'
  );
  const matches = fullRegex.exec(text);

  let matchLength = fullRegex.lastIndex;

  if (!matches || matches.index === 0) {
    return undefined;
  }

  // Look for an era
  let era = text.substring(0, matches.index).trim();

  if (era in eraAliases) {
    era = eraAliases[era];
  } else if (!isEraName(era)) {
    return undefined;
  }

  // Parse year
  let year: number | null = null;
  if (typeof matches[1] !== 'undefined') {
    year = parseNumber(matches[1].replace(/(年|歳)/, '').trim());
    if (typeof year === 'number' && year < 1) {
      year = null;
    }
  } else if (typeof matches[2] !== 'undefined') {
    year = 0;
  }

  if (year === null) {
    return undefined;
  }

  // Parse month
  let month: number | null | undefined = null;
  if (typeof matches[3] !== 'undefined') {
    const isLeapMonth = matches[3].includes('閏');
    month = parseNumber(matches[3].replace('閏', '').trim());
    if (typeof month === 'number') {
      if (isLeapMonth) {
        // In the eraInfo dataset leap months are represented by negative numbers.
        month = -month;
      }

      if (isGregorianYear(era, year) && (month < 1 || month > 12)) {
        month = null;
      }
    }
  }

  if (month === null) {
    if (year === 0) {
      matchLength = matches.index + matches[2].length;
    } else {
      matchLength = matches.index + matches[1].length;
    }
    month = undefined;
  }

  // Parse day
  let day: number | null | undefined = null;
  if (typeof matches[4] !== 'undefined') {
    day = parseNumber(matches[4]);
    if (typeof day === 'number' && day < 1) {
      day = null;
    }
  }

  if (!month || !day) {
    day = undefined;
  }

  return { era, year, month, day, matchLength };
}
