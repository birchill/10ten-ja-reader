export const dbLanguages = <const>['en', 'fr', 'es', 'pt'];

export type DbLanguageId = typeof dbLanguages[number];

export const dbLanguageNames: Map<DbLanguageId, string> = new Map([
  ['en', 'English'],
  ['fr', 'Français'],
  ['es', 'Español'],
  ['pt', 'Português'],
]);

export function isDbLanguageId(id: string): id is DbLanguageId {
  return dbLanguages.includes(id as DbLanguageId);
}
