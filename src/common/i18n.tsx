import { RenderableProps, createContext } from 'preact';
import { useContext } from 'preact/hooks';
import browser from 'webextension-polyfill';

export type TranslateFunctionType = (
  key: string,
  substitutions?: string | Array<string>
) => string;

export type i18nContextType = { t: TranslateFunctionType; langTag: string };

const contextValue: i18nContextType = {
  t: browser.i18n.getMessage.bind(browser.i18n),
  langTag: browser.i18n.getMessage('lang_tag'),
};

const i18nContext = createContext<i18nContextType>(contextValue);

type LocaleType = 'en' | 'ja' | 'zh_CN';

type I18nProviderProps = { locale?: LocaleType };

export function I18nProvider(props: RenderableProps<I18nProviderProps>) {
  if (props.locale !== undefined) {
    throw new Error('Changing locale is not supported');
  }

  return (
    <i18nContext.Provider value={contextValue}>
      {props.children}
    </i18nContext.Provider>
  );
}

export function useLocale(): i18nContextType {
  return useContext(i18nContext);
}
