import { useSelect } from 'react-cosmos/client';

import { I18nProvider } from '../common/i18n';

import { DbStatus } from './DbStatus';

export default {
  default: () => {
    const [locale] = useSelect('locale', {
      options: ['en', 'ja', 'zh_hans'],
    });

    return (
      <I18nProvider locale={locale}>
        <DbStatus />
      </I18nProvider>
    );
  },
};
