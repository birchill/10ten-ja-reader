export type BunproDeckType = 'vocab' | 'grammar';

const bunproPaths: Record<BunproDeckType, string> = {
  vocab: 'vocabs',
  grammar: 'grammar_points',
};

/**
 * Builds the URL of the Bunpro page for a term we matched a headword against.
 *
 * Bunpro's URL is not simply the term. It disambiguates its slugs -- 額 lives at
 * /vocabs/額-ひたい, 如く at /grammar_points/如く-如き-如し, and a term written with
 * a middle dot has it replaced with a hyphen -- so for those the data gives us
 * the slug directly.
 *
 * @param slug Bunpro's slug, present only where it isn't the term.
 * @param src The Bunpro term, present only where it isn't the headword, i.e.
 *            where we matched it fuzzily (相違ない matched against に相違ない).
 * @param ent The headword itself, which is the term when neither of the above
 *            is given.
 */
export function getBunproUrl({
  type,
  slug,
  src,
  ent,
}: {
  type: BunproDeckType;
  slug?: string;
  src?: string;
  ent: string;
}): string {
  return `https://bunpro.jp/${bunproPaths[type]}/${encodeURIComponent(slug ?? src ?? ent)}`;
}
