import { Dialect, KanjiResult, LangSource } from '@birchill/jpdict-idb';

import type {
  NameResult,
  Sense,
  WordResult,
} from '../background/search-result';
import type { CopyType } from '../common/copy-keys';
import type { TranslateFunctionType } from '../common/i18n';
import { highPriorityLabels } from '../common/priority-labels';
import {
  ReferenceAbbreviation,
  getSelectedReferenceLabels,
} from '../common/refs';

import { getReferenceValue } from './reference-value';

export type CopyEntry =
  | { type: 'word'; data: WordResult }
  | { type: 'name'; data: NameResult }
  | { type: 'kanji'; data: KanjiResult };

export function getTextToCopy({
  entry,
  copyType,
  getMessage,
  includeAllSenses = true,
  includeLessCommonHeadwords = true,
  includePartOfSpeech = true,
  kanjiReferences = [] as Array<ReferenceAbbreviation>,
  showKanjiComponents = true,
}: {
  entry: CopyEntry;
  copyType: CopyType;
  getMessage: TranslateFunctionType;
  includeAllSenses?: boolean;
  includeLessCommonHeadwords?: boolean;
  includePartOfSpeech?: boolean;
  kanjiReferences?: Array<ReferenceAbbreviation>;
  showKanjiComponents?: boolean;
}): string {
  switch (copyType) {
    case 'entry':
      return getEntryToCopy(entry, {
        getMessage,
        includeAllSenses,
        includeLessCommonHeadwords,
        includePartOfSpeech,
        kanjiReferences,
        showKanjiComponents,
      });

    case 'tab':
      return getFieldsToCopy(entry, {
        getMessage,
        includeAllSenses,
        includeLessCommonHeadwords,
        includePartOfSpeech,
        kanjiReferences,
        showKanjiComponents,
      });

    case 'word':
      return getWordToCopy(entry);
  }
}

export function getWordToCopy(entry: CopyEntry): string {
  let result: string;

  switch (entry.type) {
    case 'word':
      {
        let headwords = entry.data.k?.length
          ? entry.data.k.filter((k) => !k.i?.includes('sK'))
          : entry.data.r.filter((r) => !r.i?.includes('sk'));

        // Only show matches -- unless our only matches were search-only
        // terms -- in which case we want to include all headwords.
        if (headwords.some((h) => h.match)) {
          headwords = headwords.filter((entry) => entry.match);
        }

        result = headwords.map((entry) => entry.ent).join(', ');
      }
      break;

    case 'name':
      result = (entry.data.k || entry.data.r).join(', ');
      break;

    case 'kanji':
      result = entry.data.c;
      break;
  }

  return result!;
}

export function getEntryToCopy(
  entry: CopyEntry,
  {
    getMessage,
    includeAllSenses = true,
    includeLessCommonHeadwords = true,
    includePartOfSpeech = true,
    kanjiReferences = [] as Array<ReferenceAbbreviation>,
    showKanjiComponents = true,
  }: {
    getMessage: TranslateFunctionType;
    includeAllSenses?: boolean;
    includeLessCommonHeadwords?: boolean;
    includePartOfSpeech?: boolean;
    kanjiReferences?: Array<ReferenceAbbreviation>;
    showKanjiComponents?: boolean;
  }
): string {
  let result: string;

  switch (entry.type) {
    case 'word':
      {
        const kanjiHeadwords = entry.data.k
          ? filterRelevantKanjiHeadwords(entry.data.k, {
              includeLessCommonHeadwords,
            }).map((k) => k.ent)
          : [];
        const kanaHeadwords = filterRelevantKanaHeadwords(entry.data.r, {
          includeLessCommonHeadwords,
        }).map((r) => r.ent);

        result = kanjiHeadwords.length
          ? `${kanjiHeadwords.join(', ')} [${kanaHeadwords.join(', ')}]`
          : kanaHeadwords.join(', ');
        if (entry.data.romaji?.length) {
          result += ` (${entry.data.romaji.join(', ')})`;
        }

        result +=
          (includeAllSenses ? '\n' : ' ') +
          serializeDefinition(entry.data, {
            getMessage,
            includeAllSenses,
            includePartOfSpeech,
            oneSensePerLine: true,
          });
      }
      break;

    case 'name':
      result = entry.data.k
        ? `${entry.data.k.join(', ')} [${entry.data.r.join(', ')}]${includeAllSenses ? '\n' : ' '}`
        : entry.data.r.join(', ') + (includeAllSenses ? '\n' : ' ');

      for (const [i, tr] of entry.data.tr.entries()) {
        if (i) {
          result += '; ';
        }
        if (includePartOfSpeech && tr.type) {
          result += `(${tr.type.join(', ')}) `;
        }
        result += tr.det.join(', ');
      }
      break;

    case 'kanji':
      {
        const { c, r, m, rad, comp } = entry.data;

        result = c;
        const readings = getKanjiReadings(entry.data);
        if (readings) {
          result += ` [${readings}]`;
        }
        if (r.na && r.na.length) {
          result += ` (${r.na.join('、')})`;
        }
        result += ` ${m.join(', ')}`;
        const radicalLabel = getMessage('content_kanji_radical_label');
        result += `; ${radicalLabel}: ${rad.b || rad.k}（${rad.na.join(
          '、'
        )}）`;
        if (rad.base) {
          const baseChar = (rad.base.b || rad.base.k)!;
          const baseReadings = rad.base.na.join('、');
          result +=
            ' ' +
            getMessage('content_kanji_base_radical', [baseChar, baseReadings]);
        }
        if (showKanjiComponents && comp.length) {
          const componentsLabel = getMessage('content_kanji_components_label');
          const components: Array<string> = [];
          for (const component of comp) {
            components.push(
              `${component.c} (${
                component.na.length ? component.na[0] + ', ' : ''
              }${component.m.length ? component.m[0] : ''})`
            );
          }
          result += `; ${componentsLabel}: ${components.join(', ')}`;
        }

        if (kanjiReferences.length) {
          const labels = getSelectedReferenceLabels(
            kanjiReferences,
            getMessage
          );
          for (const label of labels) {
            if (
              label.ref === 'nelson_r' &&
              !rad.nelson &&
              kanjiReferences.includes('radical')
            ) {
              continue;
            }
            result += `; ${label.short || label.full} ${
              getReferenceValue(entry.data, label.ref, getMessage) || '-'
            }`;
          }
        }
      }
      break;
  }

  return result!;
}

type KanjiHeadword = WordResult['k'][number];

const highPriorityLabelsSet = new Set(highPriorityLabels);

function filterRelevantKanjiHeadwords(
  headwords: Array<KanjiHeadword>,
  { includeLessCommonHeadwords }: { includeLessCommonHeadwords: boolean }
) {
  if (includeLessCommonHeadwords) {
    return headwords.filter((k) => !k.i?.includes('sK'));
  }

  const commonHeadwords = headwords.filter(
    (k) => !k.i?.includes('sK') && !k.i?.includes('rK')
  );

  const highPriorityHeadwords = commonHeadwords.filter((k) =>
    k.p?.some((p) => highPriorityLabelsSet.has(p))
  );
  if (highPriorityHeadwords.length) {
    return highPriorityHeadwords;
  }

  const hasPriorityHeadwords = commonHeadwords.filter((k) => k.p?.length);
  if (hasPriorityHeadwords.length) {
    return hasPriorityHeadwords;
  }

  return commonHeadwords;
}

type KanaHeadword = WordResult['r'][number];

function filterRelevantKanaHeadwords(
  headwords: Array<KanaHeadword>,
  { includeLessCommonHeadwords }: { includeLessCommonHeadwords: boolean }
) {
  if (includeLessCommonHeadwords) {
    return headwords.filter((k) => !k.i?.includes('sk'));
  }

  const commonHeadwords = headwords.filter(
    (k) => !k.i?.includes('sk') && !k.i?.includes('rk')
  );

  const highPriorityHeadwords = commonHeadwords.filter((k) =>
    k.p?.some((p) => highPriorityLabelsSet.has(p))
  );
  if (highPriorityHeadwords.length) {
    return highPriorityHeadwords;
  }

  const hasPriorityHeadwords = commonHeadwords.filter((k) => k.p?.length);
  if (hasPriorityHeadwords.length) {
    return hasPriorityHeadwords;
  }

  return commonHeadwords;
}

function serializeDefinition(
  entry: WordResult,
  {
    getMessage,
    includeAllSenses = true,
    includePartOfSpeech = true,
    oneSensePerLine = false,
  }: {
    getMessage: TranslateFunctionType;
    includeAllSenses?: boolean;
    includePartOfSpeech?: boolean;
    oneSensePerLine?: boolean;
  }
): string {
  const senses = entry.s;
  if (senses.length > 1 && includeAllSenses) {
    const nativeSenses = senses
      .filter((s) => s.lang && s.lang !== 'en')
      .map(
        (s) => `• ${serializeSense(s, { getMessage, includePartOfSpeech })}`
      );
    const enSenses = senses
      .filter((s) => !s.lang || s.lang === 'en')
      .map(
        (s, index) =>
          `(${index + 1}) ${serializeSense(s, { getMessage, includePartOfSpeech })}`
      );

    return [...nativeSenses, ...enSenses].join(oneSensePerLine ? '\n' : ' ');
  } else {
    return serializeSense(senses[0], { getMessage, includePartOfSpeech });
  }
}

// Match the formatting in Edict
const dialects: { [dial in Dialect]: string } = {
  bra: 'bra:',
  ho: 'hob:',
  tsug: 'tsug:',
  th: 'thb:',
  na: 'nab:',
  kt: 'ktb:',
  ks: 'ksb:',
  ky: 'kyb:',
  os: 'osb:',
  ts: 'tsb:',
  '9s': 'kyu:',
  ok: 'rkb:',
};

function serializeSense(
  sense: Sense,
  {
    getMessage,
    includePartOfSpeech = true,
  }: { getMessage: TranslateFunctionType; includePartOfSpeech?: boolean }
): string {
  let result = '';

  if (includePartOfSpeech && sense.pos) {
    result += `(${sense.pos.join(',')}) `;
  }
  result += sense.field ? `(${sense.field.join(',')}) ` : '';
  result += sense.misc ? `(${sense.misc.join(',')}) ` : '';
  result += sense.dial
    ? `(${sense.dial
        .map((dial) => (dial in dialects ? dialects[dial as Dialect] : dial))
        .join(',')}) `
    : '';

  const glosses: Array<string> = [];
  for (const g of sense.g) {
    let gloss = '';
    if (g.type && g.type !== 'tm' && g.type !== 'none') {
      const glossTypeStr = getMessage(`gloss_type_short_${g.type}`);
      if (glossTypeStr) {
        gloss = `(${glossTypeStr}) `;
      }
    }
    gloss += g.str;
    if (g.type === 'tm') {
      gloss += '™';
    }
    glosses.push(gloss);
  }
  result += glosses.join('; ');

  result += sense.lsrc
    ? ` (${sense.lsrc.map(serializeLangSrc).join(', ')})`
    : '';
  result += sense.inf ? ` (${sense.inf})` : '';

  return result;
}

function serializeLangSrc(lsrc: LangSource) {
  const lang = lsrc.wasei ? 'wasei' : lsrc.lang;
  const parts = [];
  if (lang) {
    parts.push(lang);
  }
  if (lsrc.src) {
    parts.push(lsrc.src);
  }
  return parts.join(': ');
}

export function getFieldsToCopy(
  entry: CopyEntry,
  {
    getMessage,
    includeAllSenses = true,
    includeLessCommonHeadwords = true,
    includePartOfSpeech = true,
    kanjiReferences = [] as Array<ReferenceAbbreviation>,
    showKanjiComponents = true,
  }: {
    getMessage: TranslateFunctionType;
    includeAllSenses?: boolean;
    includeLessCommonHeadwords?: boolean;
    includePartOfSpeech?: boolean;
    kanjiReferences?: Array<ReferenceAbbreviation>;
    showKanjiComponents?: boolean;
  }
): string {
  let result: string;

  switch (entry.type) {
    case 'word':
      result = entry.data.k
        ? filterRelevantKanjiHeadwords(entry.data.k, {
            includeLessCommonHeadwords,
          })
            .map((k) => k.ent)
            .join('; ')
        : '';
      result +=
        '\t' +
        filterRelevantKanaHeadwords(entry.data.r, {
          includeLessCommonHeadwords,
        })
          .map((r) => r.ent)
          .join('; ');
      if (entry.data.romaji?.length) {
        result += '\t' + entry.data.romaji.join('; ');
      }

      result +=
        '\t' +
        serializeDefinition(entry.data, {
          getMessage,
          includeAllSenses,
          includePartOfSpeech,
        });
      break;

    case 'name':
      {
        let definition = '';
        for (const [i, tr] of entry.data.tr.entries()) {
          if (i) {
            definition += '; ';
          }
          if (includePartOfSpeech && tr.type) {
            definition += `(${tr.type.join(', ')}) `;
          }
          definition += tr.det.join(', ');
        }

        // Split each kanji name out into a separate row
        result = '';
        for (const [i, kanji] of (entry.data.k || ['']).entries()) {
          if (i) {
            result += '\n';
          }
          result += `${kanji}\t${entry.data.r.join(', ')}\t${definition}`;
        }
      }
      break;

    case 'kanji':
      {
        const { c, r, m, comp } = entry.data;

        result = c;
        const readings = getKanjiReadings(entry.data);
        result += `\t${readings}`;
        result += `\t${(r.na || []).join('、')}`;
        result += `\t${m.join(', ')}`;
        if (showKanjiComponents) {
          const components = comp.map((comp) => comp.c).join('');
          result += `\t${components}`;
        }
        if (kanjiReferences.length) {
          const labels = getSelectedReferenceLabels(
            kanjiReferences,
            getMessage
          );
          for (const label of labels) {
            // For some common types we don't produce the label
            switch (label.ref) {
              case 'radical':
              case 'unicode':
              case 'nelson_r':
                // All the above types also either always exist (radical,
                // unicode) or if they don't exist we want to produce an empty
                // value (not '-') hence why we don't include the ... || '-'
                // from the next block.
                result +=
                  '\t' + getReferenceValue(entry.data, label.ref, getMessage);
                break;

              default:
                result += `\t${label.short || label.full} ${
                  getReferenceValue(entry.data, label.ref, getMessage) || '-'
                }`;
                break;
            }
          }
        }
      }
      break;
  }

  return result!;
}

function getKanjiReadings(kanji: KanjiResult): string {
  return [
    ...(kanji.r.on ? kanji.r.on : []),
    ...(kanji.r.kun ? kanji.r.kun : []),
  ].join('、');
}
