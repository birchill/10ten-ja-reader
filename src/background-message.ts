import { discriminator } from '@birchill/discriminator';
import * as s from 'superstruct';

export const BackgroundMessageSchema = discriminator('type', {
  disable: s.type({}),
  enable: s.type({
    // We don't validate the contents of the config object yet
    config: s.type({}),
    id: s.optional(s.number()),
  }),
  updateSearchResult: s.type({
    // We don't validate the contents of the search result yet
    result: s.nullable(s.type({})),
  }),
});

export type BackgroundMessage = s.Infer<typeof BackgroundMessageSchema>;
