import type { RenderableProps } from 'preact';
import { useSelect } from 'react-cosmos/client';

import { I18nProvider } from '../../common/i18n';
import { EmptyProps } from '../../utils/type-helpers';

import '../../../css/themes.css';

export default ({ children }: RenderableProps<EmptyProps>) => {
  const [locale] = useSelect('locale', {
    options: ['en', 'ja', 'zh_hans'],
  });

  const [themeName] = useSelect('theme', {
    options: ['black', 'light', 'blue', 'lightblue', 'yellow'],
    defaultValue: 'light',
  });

  return (
    <I18nProvider locale={locale}>
      <div className={`theme-${themeName}`}>{children}</div>
    </I18nProvider>
  );
};
