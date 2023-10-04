import type { RenderableProps } from 'preact';
import { useSelect } from 'react-cosmos/client';

import { I18nProvider } from '../common/i18n';

export default ({ children }: RenderableProps<{}>) => {
  const [locale] = useSelect('locale', {
    options: ['en', 'ja', 'zh_hans'],
  });

  return <I18nProvider locale={locale}>{children}</I18nProvider>;
};
