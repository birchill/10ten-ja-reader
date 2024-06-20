import type { RenderableProps } from 'preact';
import { useLayoutEffect } from 'preact/hooks';
import { useFixtureInput, useFixtureSelect } from 'react-cosmos/client';

import { I18nProvider } from '../../common/i18n';
import { EmptyProps } from '../../utils/type-helpers';

export default ({ children }: RenderableProps<EmptyProps>) => {
  const [locale] = useFixtureSelect('locale', {
    options: ['en', 'ja', 'zh_hans'],
  });

  const [themeName] = useFixtureSelect('theme', {
    options: ['black', 'light', 'blue', 'lightblue', 'yellow'],
    defaultValue: 'light',
  });

  const [fontSize] = useFixtureSelect('font size', {
    options: ['normal', 'large', 'xl'],
  });

  // This is here so that we can test that components do not change when the
  // root font size of the document changes (i.e. test that we are NOT using
  // `rem` units).
  const [massivePageFontSize] = useFixtureInput('rem unit check', false);

  useLayoutEffect(() => {
    if (massivePageFontSize) {
      window.document.documentElement.style.fontSize = '50px';
    } else {
      window.document.documentElement.style.fontSize = '';
    }
  }, [massivePageFontSize]);

  return (
    <I18nProvider locale={locale}>
      <div
        className={`theme-${themeName}`}
        style={{
          '--base-font-size': `var(--${fontSize}-font-size)`,
        }}
      >
        {children}
      </div>
    </I18nProvider>
  );
};
