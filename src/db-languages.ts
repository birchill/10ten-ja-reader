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

export const dbLanguageMeta: Array<
  [DbLanguageId, { name: string; hasKanji?: boolean; hasWords?: boolean }]
> = [
  ['de', { name: 'Deutsch', hasWords: true }],
  ['en', { name: 'English', hasKanji: true, hasWords: true }],
  ['es', { name: 'Español', hasKanji: true, hasWords: true }],
  ['fr', { name: 'Français', hasKanji: true, hasWords: true }],
  ['hu', { name: 'Magyar', hasWords: true }],
  ['nl', { name: 'Nederlands', hasWords: true }],
  ['pt', { name: 'Português', hasKanji: true }],
  ['ru', { name: 'Русский', hasWords: true }],
  ['sl', { name: 'Slovenščina', hasWords: true }],
  ['sv', { name: 'Svenska', hasWords: true }],
];

export function isDbLanguageId(id: string): id is DbLanguageId {
  return dbLanguages.includes(id as DbLanguageId);
}
