import { discriminator } from '@birchill/discriminator';
import * as s from 'superstruct';

const SearchRequestSchema = s.type({
  input: s.string(),
  includeRomaji: s.optional(s.boolean()),
});

export type SearchRequest = s.Infer<typeof SearchRequestSchema>;

export const BackgroundRequestSchema = discriminator('type', {
  disabled: s.type({}),
  'enable?': s.type({}),
  enabled: s.type({
    src: s.string(),
  }),
  options: s.type({}),
  // TODO: Remove 'search' once we have shipped the two-step search approach.
  //
  // It is provided now for the sake of supporting content scripts from previous
  // versions.
  search: SearchRequestSchema,
  searchWords: SearchRequestSchema,
  searchOther: SearchRequestSchema,
  switchedDictionary: s.type({}),
  toggleDefinition: s.type({}),
  translate: s.type({
    input: s.string(),
    includeRomaji: s.optional(s.boolean()),
  }),
});

export type BackgroundRequest = s.Infer<typeof BackgroundRequestSchema>;
