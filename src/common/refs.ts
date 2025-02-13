import { DbLanguageId } from './db-languages';
import { TranslateFunctionType } from './i18n';

const SUPPORTED_REFERENCES = [
  // The radical for the kanji (number and character, from rad field)
  'radical',
  // Nelson radical (from rad field)
  'nelson_r',
  // Kanji kentei (from misc field)
  'kk',
  // WaniKani level (from misc field)
  'wk',
  // Pinyin reading
  'py',
  // JLPT level (from misc field)
  'jlpt',
  // Unicode codepoint (generated)
  'unicode',
  // Conning, The Kodansha Kanji Learner's Course
  'conning',
  // New Japanese-English Character Dictionary
  'halpern_njecd',
  // Learners Dictionary 2nd ed.
  'halpern_kkld_2ed',
  // Remembering the Kanji (6th ed.)
  'heisig6',
  // A Guide To Remembering Japanese Characters
  'henshall',
  // Kanji and Kana (2011 edition)
  'sh_kk2',
  // Japanese For Busy People vols I-III
  'busy_people',
  // Kanji in Context by Nishiguchi and Kono
  'kanji_in_context',
  // the Kodansha Compact Kanji Guide
  'kodansha_compact',
  // Yves Maniette's "Les Kanjis dans la tete" French adaptation of Heisig
  // (Only included for lang:fr)
  'maniette',
  // "Classic" Nelson - Modern Reader's Japanese-English Character Dictionary
  'nelson_c',
  // The New Nelson Japanese-English Character Dictionary
  'nelson_n',
  // Halpern's SKIP (System of Kanji Indexing by Patterns)
  'skip',
  // Descriptor codes for The Kanji Dictionary
  'sh_desc',
] as const;

export type ReferenceAbbreviation = (typeof SUPPORTED_REFERENCES)[number];

export function getReferencesForLang(lang: DbLanguageId) {
  if (lang !== 'fr') {
    return SUPPORTED_REFERENCES.filter((ref) => ref !== 'maniette');
  }
  return SUPPORTED_REFERENCES;
}

const REFERENCE_ABBREV_MAPPING: { [key: string]: ReferenceAbbreviation } = {
  CO: 'conning',
  H: 'halpern_njecd',
  L: 'heisig6',
  E: 'henshall',
  KK: 'kk',
  DK: 'halpern_kkld_2ed',
  N: 'nelson_c',
  NR: 'nelson_r',
  V: 'nelson_n',
  P: 'skip',
  IN: 'sh_kk2',
  I: 'sh_desc',
  U: 'unicode',
  Y: 'py',
  WK: 'wk',
} as const;

export function convertLegacyReference(
  ref: string
): ReferenceAbbreviation | undefined {
  return REFERENCE_ABBREV_MAPPING.hasOwnProperty(ref)
    ? REFERENCE_ABBREV_MAPPING[ref]
    : undefined;
}

type LocalizedReferences = 'radical' | 'nelson_r' | 'kk' | 'jlpt' | 'unicode';
type NotLocalizedReferences = Exclude<
  ReferenceAbbreviation,
  LocalizedReferences
>;
type ReferenceLabel = { full: string; short?: string; lang: string };

// Note that when adding or modifying labels here, it is important that the full
// and short versions sort roughly the same so that they appear to be in
// alphabetical order in both the popup (where we use the short form) and
// options page (where we use the long form).
//
// We sort by the short label, where available, which enables, for example,
// showing an initial "The" in the long label but still sorting by the short
// label (which does not include the "The"). Such exceptions aside, however, the
// full and short versions should generally start with the same first few words.
const REFERENCE_LABELS: { [key in NotLocalizedReferences]: ReferenceLabel } = {
  conning: {
    full: "Conning - Kodansha Kanji Learner's Course",
    short: 'Conning',
    lang: 'en',
  },
  sh_kk2: {
    full: 'Kanji & Kana (Hadamitzky, Tuttle, 2011)',
    short: 'Kanji & Kana',
    lang: 'en',
  },
  halpern_njecd: {
    full: 'Halpern - New Japanese-English Character Dictionary',
    short: 'Halpern',
    lang: 'en',
  },
  halpern_kkld_2ed: {
    full: "Kanji Learner's Dictionary (Halpbern, Kodansha, 2nd ed.)",
    short: "Kanji Learner's Dictionary",
    lang: 'en',
  },
  heisig6: {
    full: 'Heisig - Rembering the Kanji (6th ed.)',
    short: 'Heisig',
    lang: 'en',
  },
  henshall: {
    full: 'Henshall - A Guide to Remembering Japanese Characters',
    short: 'Henshall',
    lang: 'en',
  },
  busy_people: { full: 'Japanese for Busy People', lang: 'en' },
  kanji_in_context: { full: 'Kanji in Context', lang: 'en' },
  kodansha_compact: {
    full: 'Compact Kanji Guide (Kodansha)',
    short: 'Compact Kanji Guide',
    lang: 'en',
  },
  maniette: { full: 'Les Kanjis dans la tete', lang: 'fr' },
  nelson_c: {
    full: "Classic Nelson - Modern Reader's Japanese-English Character Dictionary",
    short: 'Classic Nelson',
    lang: 'en',
  },
  nelson_n: {
    full: 'New Nelson Japanese-English Character Dictionary',
    short: 'New Nelson',
    lang: 'en',
  },
  py: { full: 'Pinyin', lang: 'en' },
  skip: { full: 'SKIP', lang: 'en' },
  sh_desc: {
    full: 'The Kanji Dictionary (Spahn)',
    short: 'Kanji Dictionary',
    lang: 'en',
  },
  wk: { full: 'WaniKani level', short: 'WaniKani', lang: 'en' },
} as const;

// Get an array matching reference abbreviations to suitable names.
//
// These two methods return an array, not a map or object, since we try to
// preserve the same order of references everywhere we present them.
//
// For the localized ones (radical, JLPT, kk, unicode), we look up the
// appropriate string. For the others, we return a fixed string. (This way we
// keep complete string keys--not concatenated strings--in the source so we can
// readily determine which strings are in use.)

type ReferenceAndLabel = { ref: ReferenceAbbreviation } & ReferenceLabel;

export function getReferenceLabelsForLang(
  lang: string,
  t: TranslateFunctionType
): Array<ReferenceAndLabel> {
  const result: Array<ReferenceAndLabel> = [];

  for (const ref of SUPPORTED_REFERENCES) {
    if (lang !== 'fr' && ref === 'maniette') {
      continue;
    }
    result.push({ ref, ...getLabelForReference(ref, t) });
  }

  // Sort by short version first since this is what will be shown in the pop-up.
  result.sort((a, b) => (a.short || a.full).localeCompare(b.short || b.full));

  return result;
}

export function getSelectedReferenceLabels(
  selectedRefs: ReadonlyArray<ReferenceAbbreviation>,
  t: TranslateFunctionType
): Array<ReferenceAndLabel> {
  const result: Array<ReferenceAndLabel> = [];
  const selectedRefsSet = new Set<ReferenceAbbreviation>(selectedRefs);

  for (const ref of SUPPORTED_REFERENCES) {
    if (!selectedRefsSet.has(ref)) {
      continue;
    }
    result.push({ ref, ...getLabelForReference(ref, t) });
  }

  // Sort by short version first since this is what will be shown in the pop-up.
  result.sort((a, b) => (a.short || a.full).localeCompare(b.short || b.full));

  return result;
}

function getLabelForReference(
  ref: ReferenceAbbreviation,
  t: TranslateFunctionType
): ReferenceLabel {
  const lang = t('lang_tag');

  switch (ref) {
    case 'radical':
      return { full: t('ref_label_radical'), lang };

    case 'nelson_r':
      return { full: t('ref_label_nelson_r'), lang };

    case 'kk':
      return { full: t('ref_label_kk'), lang };

    case 'jlpt':
      return { full: t('ref_label_jlpt'), lang };

    case 'py':
      return { full: t('ref_label_py'), lang };

    case 'unicode':
      return { full: t('ref_label_unicode'), lang };

    default:
      return REFERENCE_LABELS[ref];
  }
}
