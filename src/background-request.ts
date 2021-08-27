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
  options: s.type({}),
  reportWarning: s.type({
    message: s.string(),
  }),
  search: SearchRequestSchema,
  switchedDictionary: s.type({}),
  toggleDefinition: s.type({}),
  translate: s.type({
    input: s.string(),
    includeRomaji: s.optional(s.boolean()),
  }),
});

export type BackgroundRequest = s.Infer<typeof BackgroundRequestSchema>;
