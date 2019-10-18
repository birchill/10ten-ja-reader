export const SUPPORTED_REFERENCES = [
  // The radical for the kanji (number and character, from rad field)
  'radical',
  // Nelson radical (from rad field)
  'nelson_r',
  // Kanji kentei (from misc field)
  'kk',
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
  // Halpern's SKIP (System  of  Kanji  Indexing  by  Patterns)
  'skip',
  // Descriptor codes for The Kanji Dictionary
  'sh_desc',
] as const;

export type ReferenceAbbreviation = typeof SUPPORTED_REFERENCES[number];

const REFERENCE_ABBREV_MAPPING: {
  [key: string]: ReferenceAbbreviation;
} = {
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
} as const;

// Takes an array of older-style reference abbreviations (e.g. 'E' for Henshall)
// and converts them to the new ones. It also adds new ones that are on by
// default -- namely radical.
export function convertReferences(
  refs: ReadonlyArray<string>
): Array<ReferenceAbbreviation> {
  const result: Array<ReferenceAbbreviation> = ['radical'];

  for (const ref of refs) {
    if (REFERENCE_ABBREV_MAPPING.hasOwnProperty(ref)) {
      result.push(REFERENCE_ABBREV_MAPPING[ref]);
    }
  }

  return result;
}

type LocalizedReferences = 'radical' | 'kk' | 'jlpt' | 'unicode';
type NotLocalizedReferences = Exclude<
  ReferenceAbbreviation,
  LocalizedReferences
>;

const REFERENCE_LABELS: {
  [key in NotLocalizedReferences]: { full: string; short?: string };
} = {
  nelson_r: { full: 'Nelson radical' },
  conning: {
    full: "Conning - Kodansha Kanji Learner's Course",
    short: 'Conning',
  },
  sh_kk2: {
    full: 'Hadamitzky - Tuttle Kanji & Kana (2011)',
    short: 'Kanji & Kana',
  },
  halpern_njecd: {
    full: 'Halpern - New Japanese-English Character Dictionary',
    short: 'Halpern',
  },
  halpern_kkld_2ed: {
    full: "Halpern - Kodansha Kanji Learner's Dictionary (2nd ed.)",
    short: "Kanji Learner's Dictionary",
  },
  heisig6: { full: 'Heisig - Rembering the Kanji (6th ed.)', short: 'Heisig' },
  henshall: {
    full: 'Henshall - A Guide to Remembering Japanese Characters',
    short: 'Henshall',
  },
  busy_people: { full: 'Japanese for Busy People' },
  kanji_in_context: { full: 'Kanji in Context' },
  kodansha_compact: {
    full: 'Kodansha Compact Kanji Guide',
    short: 'Compact Kanji Guide',
  },
  maniette: { full: 'Les Kanjis dans la tete' },
  nelson_c: {
    full:
      "Classic Nelson - Modern Reader's Japanese-English Character Dictionary",
    short: 'Classic Nelson',
  },
  nelson_n: {
    full: 'New Nelson Japanese-English Character Dictionary',
    short: 'New Nelson',
  },
  skip: { full: 'SKIP' },
  sh_desc: {
    full: 'Spahn - The Kanji Dictionary',
    short: 'The Kanji Dictionary',
  },
} as const;

// Returns an array matching reference abbreviations to suitable names.
//
// It turns an array, not a map or object, since we try to preserve the same
// order of references everywhere we present them.
//
// For the localized ones (radical, JLPT, kk, unicode), looks up the appropriate
// string. For the others, returns a fixed string. (This way we keep complete
// string keys--not concatenated strings--in the source so we can readily
// determine which strings are in use.)
//
// The 'lang' option is used to filter out reference types that are only
// available in certain languages.
//
// The 'selectedRefs' is used to only return labels for the specified references
// so the client can just iterate over the result.
export function getReferenceNames({
  lang,
  selectedRefs,
}: {
  lang?: string;
  selectedRefs?: ReadonlyArray<ReferenceAbbreviation>;
}): Array<{ ref: ReferenceAbbreviation; full: string; short?: string }> {
  const result: Array<{
    ref: ReferenceAbbreviation;
    full: string;
    short?: string;
  }> = [];
  const selectedRefsSet = new Set<ReferenceAbbreviation>(selectedRefs || []);

  for (const ref of SUPPORTED_REFERENCES) {
    if (selectedRefs && !selectedRefsSet.has(ref)) {
      continue;
    }

    switch (ref) {
      case 'radical':
        result.push({
          ref,
          full: browser.i18n.getMessage('ref_label_radical'),
        });
        break;

      case 'kk':
        result.push({ ref, full: browser.i18n.getMessage('ref_label_kk') });
        break;

      case 'jlpt':
        result.push({ ref, full: browser.i18n.getMessage('ref_label_jlpt') });
        break;

      case 'unicode':
        result.push({
          ref,
          full: browser.i18n.getMessage('ref_label_unicode'),
        });
        break;

      default:
        // Skip maniette unless we are dealing with French
        if (lang && lang !== 'fr' && ref === 'maniette') {
          continue;
        }
        result.push({ ref, ...REFERENCE_LABELS[ref] });
        break;
    }
  }

  return result;
}
