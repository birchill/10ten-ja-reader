import { RenderableProps, createContext } from 'preact';
import { useContext, useLayoutEffect, useMemo, useState } from 'preact/hooks';
import { isObject } from '../utils/is-object';

export type TranslateFunctionType = (
  key: string,
  substitutions?: string | Array<string>
) => string;

export type i18nContextType = {
  t: TranslateFunctionType;
};

export const i18nContext = createContext<i18nContextType>({
  t: () => 'Not initialized',
});

export function I18nProvider(props: RenderableProps<{}>) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [t, setT] = useState<TranslateFunctionType>(
    () => () => 'Not initialized'
  );

  useLayoutEffect(() => {
    (async () => {
      // We need to use a build-time constant here to avoid importing locale
      // messages into the package in regular extension contexts.
      if (__EXTENSION_CONTEXT__) {
        // The browser polyfill will refuse to load in non-extension contexts
        const browser = await import('webextension-polyfill');
        setT(
          () => (key: string, substitutions?: string | Array<string>) =>
            browser.i18n.getMessage(key, substitutions)
        );
        setIsLoading(false);
      } else {
        // Assume we are in a non-extension context and just default to using
        // English.
        const { default: enMessages } = await import(
          '../../_locales/en/messages.json'
        );
        const messages = parseLocale(enMessages);
        setT(
          () => (key: string, substitutions?: string | Array<string>) =>
            localizeMessage(key, messages, substitutions)
        );
        setIsLoading(false);
      }
    })();
  }, []);

  const value = useMemo(() => ({ t }), [t]);

  return (
    <i18nContext.Provider value={value}>
      {!isLoading && props.children}
    </i18nContext.Provider>
  );
}

export function useLocale(): i18nContextType {
  return useContext(i18nContext);
}

let warnedMissingKeys = new Set<string>();

// Based on https://searchfox.org/mozilla-central/rev/37d9d6f0a77147292a87ab2d7f5906a62644f455/toolkit/components/extensions/ExtensionCommon.sys.mjs#2017
function localizeMessage(
  message: string,
  messages: LocaleData,
  substitutions: string | Array<string> = []
) {
  // Message names are case-insensitive, so normalize them to lower-case.
  message = message.toLowerCase();
  if (messages.has(message)) {
    let str = messages.get(message)!;

    if (!str.includes('$')) {
      return str;
    }

    if (!Array.isArray(substitutions)) {
      substitutions = [substitutions];
    }

    const replacer = (
      _matched: string,
      indexStr: string,
      dollarSigns: string
    ) => {
      if (indexStr) {
        // This is not quite Chrome-compatible. Chrome consumes any number
        // of digits following the $, but only accepts 9 substitutions. We
        // accept any number of substitutions.
        const index = parseInt(indexStr, 10) - 1;
        return index in (substitutions as Array<string>)
          ? substitutions[index]
          : '';
      }
      // For any series of contiguous `$`s, the first is dropped, and
      // the rest remain in the output string.
      return dollarSigns;
    };

    return str.replace(/\$(?:([1-9]\d*)|(\$+))/g, replacer);
  }

  // Check for certain pre-defined messages.
  if (message == '@@ui_locale') {
    return 'en';
  } else if (message.startsWith('@@bidi_')) {
    if (message == '@@bidi_dir') {
      return 'ltr';
    } else if (message == '@@bidi_reversed_dir') {
      return 'rtl';
    } else if (message == '@@bidi_start_edge') {
      return 'left';
    } else if (message == '@@bidi_end_edge') {
      return 'right';
    }
  }

  if (!warnedMissingKeys.has(message)) {
    console.error(`Unknown localization message ${message}`);
    warnedMissingKeys.add(message);
  }

  return '';
}

type LocaleData = Map<string, string>;

// Validates the contents of a locale JSON file, normalizes the
// messages into a Map of message key -> localized string pairs.
//
// From: https://searchfox.org/mozilla-central/rev/37d9d6f0a77147292a87ab2d7f5906a62644f455/toolkit/components/extensions/ExtensionCommon.sys.mjs#2114
function parseLocale(messages: unknown): LocaleData {
  let result = new Map();

  // Chrome does not document the semantics of its localization
  // system very well. It handles replacements by pre-processing
  // messages, replacing |$[a-zA-Z0-9@_]+$| tokens with the value of their
  // replacements. Later, it processes the resulting string for
  // |$[0-9]| replacements.
  //
  // Again, it does not document this, but it accepts any number
  // of sequential |$|s, and replaces them with that number minus
  // 1. It also accepts |$| followed by any number of sequential
  // digits, but refuses to process a localized string which
  // provides more than 9 substitutions.
  if (!isObject(messages)) {
    throw new Error('Invalid locale data');
  }

  for (let key of Object.keys(messages)) {
    let msg = messages[key];

    if (!isObject(msg) || typeof msg.message != 'string') {
      throw new Error(
        `Invalid locale message data for message ${JSON.stringify(key)}`
      );
    }

    // Substitutions are case-insensitive, so normalize all of their names
    // to lower-case.
    const placeholders = new Map();
    if ('placeholders' in msg && isObject(msg.placeholders)) {
      for (let key of Object.keys(msg.placeholders)) {
        placeholders.set(key.toLowerCase(), msg.placeholders[key]);
      }
    }

    const replacer = (_match: string, name: string) => {
      let replacement = placeholders.get(name.toLowerCase());
      if (isObject(replacement) && 'content' in replacement) {
        return replacement.content;
      }
      return '';
    };

    const value = msg.message.replace(/\$([A-Za-z0-9@_]+)\$/g, replacer);

    // Message names are also case-insensitive, so normalize them to lower-case.
    result.set(key.toLowerCase(), value);
  }

  return result;
}
