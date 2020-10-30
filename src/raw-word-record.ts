import { stripFields } from './strip-fields';
import {
  ExtendedSense,
  Gloss,
  GlossType,
  KanjiMeta,
  ReadingMeta,
  WordSense,
  WordResult,
  BITS_PER_GLOSS_TYPE,
} from './word-result';

// This type matches the structure of the records in the flat file database.
// As a result it is only used as part of the fallback mechanism.

export interface RawWordRecord {
  k?: Array<string>;
  km?: Array<0 | KanjiMeta>;
  r: Array<string>;
  rm?: Array<0 | ReadingMeta>;
  s: Array<WordSense>;
}

export function toWordResult(entry: RawWordRecord): WordResult {
  return {
    k: mergeMeta(entry.k, entry.km, (key, meta) => ({
      ent: key,
      ...meta,
      match: true,
    })),
    r: mergeMeta(entry.r, entry.rm, (key, meta) => ({
      ent: key,
      ...meta,
      match: true,
    })),
    s: expandSenses(entry.s),
  };
}

function mergeMeta<MetaType extends KanjiMeta | ReadingMeta, MergedType>(
  keys: Array<string> | undefined,
  metaArray: Array<0 | MetaType> | undefined,
  merge: (key: string, meta?: MetaType) => MergedType
): Array<MergedType> {
  const result: Array<MergedType> = [];

  for (const [i, key] of (keys || []).entries()) {
    const meta: MetaType | undefined =
      metaArray && metaArray.length >= i + 1 && metaArray[i] !== 0
        ? (metaArray[i] as MetaType)
        : undefined;
    result.push(merge(key, meta));
  }

  return result;
}

function expandSenses(senses: Array<WordSense>): Array<ExtendedSense> {
  return senses.map((sense, i) => ({
    g: expandGlosses(sense),
    ...stripFields(sense, ['g', 'gt']),
    match: true,
  }));
}

function expandGlosses(sense: WordSense): Array<Gloss> {
  // Helpers to work out the gloss type
  const gt = sense.gt || 0;
  const typeMask = (1 << BITS_PER_GLOSS_TYPE) - 1;
  const glossTypeAtIndex = (i: number): GlossType => {
    return (gt >> (i * BITS_PER_GLOSS_TYPE)) & typeMask;
  };

  return sense.g.map((gloss, i) => {
    // This rather convoluted mess is because our test harness differentiates
    // between properties that are not set and those that are set to
    // undefined.
    const result: Gloss = { str: gloss };

    const type = glossTypeAtIndex(i);
    if (type !== GlossType.None) {
      result.type = type;
    }

    return result;
  });
}
