import * as fs from 'fs';
import * as path from 'path';

import { isObject } from '../../utils/is-object';

export function mockGetMessage(
  locale: 'en' | 'ja' | 'zh_CN',
  id: string,
  replacements?: string | Array<string>
) {
  const messageContents = fs.readFileSync(
    path.join(__dirname, '..', '..', '..', '_locales', locale, 'messages.json'),
    { encoding: 'utf8' }
  );
  if (!messageContents) {
    throw new Error(`Could not read messages.json for locale \`${locale}\``);
  }

  const messages = JSON.parse(messageContents);
  const stringInfo = messages[id];
  if (!messages) {
    throw new Error(
      `Could not find message \`${id}\` for locale \`${locale}\``
    );
  }

  const message = stringInfo.message as string;

  if (!message.includes('$')) {
    return message;
  }

  // Expand placeholders
  // Based on https://searchfox.org/mozilla-central/rev/78963fe42f8d5f582f84da84a5e78377b6c1fc32/toolkit/components/extensions/ExtensionCommon.jsm#1919
  const placeholders = new Map();
  if ('placeholders' in stringInfo && isObject(stringInfo.placeholders)) {
    for (const key of Object.keys(stringInfo.placeholders)) {
      placeholders.set(key.toLowerCase(), stringInfo.placeholders[key]);
    }
  }

  const placeholderReplacer = (_match: string, name: string) => {
    const replacement = placeholders.get(name.toLowerCase());
    if (isObject(replacement) && 'content' in replacement) {
      return replacement.content;
    }
    return '';
  };

  const expandedMessage = message.replace(
    /\$([A-Za-z0-9@_]+)\$/g,
    placeholderReplacer
  );

  const substitutions: Array<string> = replacements
    ? Array.isArray(replacements)
      ? replacements
      : [replacements]
    : [];

  // Based on https://searchfox.org/mozilla-central/rev/78963fe42f8d5f582f84da84a5e78377b6c1fc32/toolkit/components/extensions/ExtensionCommon.jsm#1919
  const stringReplacer = (
    _matched: string,
    index: string,
    dollarSigns: string
  ) => {
    if (index) {
      // This is not quite Chrome-compatible. Chrome consumes any number
      // of digits following the $, but only accepts 9 substitutions. We
      // accept any number of substitutions.
      const indexAsNum = parseInt(index, 10) - 1;
      return indexAsNum in substitutions ? substitutions[indexAsNum] : '';
    }
    // For any series of contiguous `$`s, the first is dropped, and
    // the rest remain in the output string.
    return dollarSigns;
  };
  return expandedMessage.replace(/\$(?:([1-9]\d*)|(\$+))/g, stringReplacer);
}
