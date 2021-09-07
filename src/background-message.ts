import { discriminator } from '@birchill/discriminator';
import * as s from 'superstruct';

export const BackgroundMessageSchema = discriminator('type', {
  disable: s.type({}),
  enable: s.type({
    // We don't validate the contents of the config object yet
    config: s.type({}),
    id: s.optional(s.number()),
  }),
  isTopMost: s.type({}),
});

export type BackgroundMessage = s.Infer<typeof BackgroundMessageSchema>;
