import type { RenderableProps } from 'preact';
import { useLayoutEffect } from 'preact/hooks';
import { useFixtureInput, useFixtureSelect } from 'react-cosmos/client';

import { I18nProvider } from '../../common/i18n';
import { EmptyProps } from '../../utils/type-helpers';

import { PopupOptionsProvider } from './options-context';

export default function PopupDecorator({
  children,
}: RenderableProps<EmptyProps>) {
  const [locale] = useFixtureSelect('locale', {
    options: ['en', 'ja', 'zh_CN'],
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

  // For when the popup is marked as being interactive
  const [interactive] = useFixtureInput('interactive', true);

  useLayoutEffect(() => {
    if (massivePageFontSize) {
      window.document.documentElement.style.fontSize = '50px';
    } else {
      window.document.documentElement.style.fontSize = '';
    }
  }, [massivePageFontSize]);

  return (
    <I18nProvider locale={locale}>
      <PopupOptionsProvider interactive={interactive}>
        <div
          className={`theme-${themeName} window bundled-fonts`}
          style={{ '--base-font-size': `var(--${fontSize}-font-size)` }}
        >
          {children}
        </div>
      </PopupOptionsProvider>
    </I18nProvider>
  );
}
