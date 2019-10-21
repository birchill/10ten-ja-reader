import { KanjiResult } from '@birchill/hikibiki-data';

import { WordEntry, NameEntry } from './query';
import { serializeTags } from './name-tags';

export type Entry =
  | { type: 'word'; data: WordEntry }
  | { type: 'name'; data: NameEntry }
  | { type: 'kanji'; data: KanjiResult };

export function getWordToCopy(entry: Entry): string {
  let result: string;

  switch (entry.type) {
    case 'word':
      result = entry.data.kanjiKana;
      break;

    case 'name':
      result = entry.data.names.map(name => name.kanji || name.kana).join(', ');
      break;

    case 'kanji':
      result = entry.data.c;
      break;
  }

  return result!;
}

export function getEntryToCopy(entry: Entry): string {
  let result: string;

  switch (entry.type) {
    case 'word':
      result = entry.data.kanjiKana;
      if (entry.data.kana.length) {
        result += ` [${entry.data.kana.join('; ')}]`;
      }
      if (entry.data.romaji.length) {
        result += ` (${entry.data.romaji.join(', ')})`;
      }
      result += ' ' + entry.data.definition;
      break;

    case 'name':
      result = entry.data.names
        .map(name => (name.kanji ? `${name.kanji} [${name.kana}]` : name.kana))
        .join(', ');

      const { text, tags } = entry.data.definition;
      let tagsText = serializeTags(tags);
      if (tagsText) {
        tagsText = `(${tagsText}) `;
      }
      result += ` ${tagsText}${text}`;
      break;

    case 'kanji':
      {
        const { c, r, m, rad, comp } = entry.data;

        result = c;
        const commonReadings = [
          ...(r.on ? r.on : []),
          ...(r.kun ? r.kun : []),
        ].join('、');
        if (commonReadings) {
          result += ` [${commonReadings}]`;
        }
        if (r.na && r.na.length) {
          result += ` (${r.na.join(`、`)})`;
        }
        result += ` ${m.join(', ')}`;
        const radicalLabel = browser.i18n.getMessage(
          'content_kanji_radical_label'
        );
        result += `; ${radicalLabel}: ${rad.b || rad.k}（${rad.na.join(
          '、'
        )}）`;
        if (rad.base) {
          const baseChar = (rad.base.b || rad.base.k)!;
          const baseReadings = rad.base.na.join('、');
          result +=
            ' ' +
            browser.i18n.getMessage('content_kanji_base_radical', [
              baseChar,
              baseReadings,
            ]);
        }
        if (comp.length) {
          const componentsLabel = browser.i18n.getMessage(
            'content_kanji_components_label'
          );
          let components: Array<string> = [];
          for (const component of comp) {
            components.push(
              `${component.c} ${component.na.join('、')} (${component.m.join(
                ', '
              )})`
            );
          }
          result += `; ${componentsLabel}: ${components.join(', ')}`;
        }
        // TODO: Export references
      }
      break;
  }

  return result!;
}

export function getFieldsToCopy(entry: Entry): string {
  let result: string;

  switch (entry.type) {
    case 'word':
      result = entry.data.kanjiKana;
      result += `\t${entry.data.kana.join('; ')}`;
      if (entry.data.romaji.length) {
        result += `\t${entry.data.romaji.join('; ')}`;
      }
      result += `\t${entry.data.definition.replace(/\//g, '; ')}`;
      break;

    case 'name':
      {
        const { text, tags } = entry.data.definition;
        let tagsText = serializeTags(tags);
        if (tagsText) {
          tagsText = `(${tagsText}) `;
        }
        result = entry.data.names
          .map(name => `${name.kanji || ''}\t${name.kana}\t${tagsText}${text}`)
          .join('\n');
      }
      break;

    case 'kanji':
      {
        const { c, r, m, rad, comp } = entry.data;

        result = c;
        const commonReadings = [
          ...(r.on ? r.on : []),
          ...(r.kun ? r.kun : []),
        ].join('、');
        result += `\t${commonReadings}`;
        result += `\t${(r.na || []).join(`、`)}`;
        result += `\t${m.join(', ')}`;
        result += `\t${rad.b || rad.k}`;
        result += `\t${rad.na.join(`、`)}`;
        if (comp.length) {
          const components = comp.map(comp => comp.c).join('');
          result += `\t${components}`;
        }
        // TODO: Export references
      }
      break;
  }

  return result!;
}
