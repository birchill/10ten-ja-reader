export const dbLanguages = <const>[
  'de',
  'en',
  'es',
  'fr',
  'hu',
  'nl',
  'pt',
  'ru',
  'sl',
  'sv',
];

export type DbLanguageId = typeof dbLanguages[number];

export const dbLanguageNames: Map<DbLanguageId, string> = new Map([
  ['de', 'Deutsch'], // Words only
  ['en', 'English'],
  ['es', 'Español'],
  ['fr', 'Français'],
  ['hu', 'Magyar'], // Words only
  ['nl', 'Nederlands'], // Words only
  ['pt', 'Português'],
  ['ru', 'Русский'], // Words only
  ['sl', 'Slovenščina'], // Words only
  ['sv', 'Svenska'], // Words only
]);

const languagesWithKanjiTranslation: Array<DbLanguageId> = [
  'en',
  'es',
  'fr',
  'pt',
];

export function hasKanjiTranslation(lang: DbLanguageId): boolean {
  return languagesWithKanjiTranslation.includes(lang);
}

export function isDbLanguageId(id: string): id is DbLanguageId {
  return dbLanguages.includes(id as DbLanguageId);
}
