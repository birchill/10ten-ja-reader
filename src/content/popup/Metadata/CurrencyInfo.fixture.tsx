import { ContentConfigParams } from '../../../common/content-config-params';

import { CurrencyMeta } from '../../currency';

import { CurrencyInfo } from './CurrencyInfo';

const TEST_DATA: Array<{
  meta: CurrencyMeta;
  fxData: NonNullable<ContentConfigParams['fx']>;
}> = [
  {
    fxData: {
      currency: 'USD',
      rate: 0.009115065781351295,
      timestamp: 1631754180485,
    },
    meta: { type: 'currency', value: 88000, matchLen: 0 },
  },
  {
    fxData: {
      currency: 'KRW',
      rate: 10.688500558390665,
      timestamp: 1631754180485,
    },
    meta: { type: 'currency', value: 88000, matchLen: 0 },
  },
  {
    fxData: {
      currency: 'AED',
      rate: 0.033166509528545496,
      timestamp: 1631754180485,
    },
    meta: { type: 'currency', value: 88000, matchLen: 0 },
  },
  {
    fxData: {
      currency: 'BTC',
      rate: 2.0997785505420689e-7,
      timestamp: 1631754180485,
    },
    meta: { type: 'currency', value: 88000, matchLen: 0 },
  },
];

export default {
  USD: <CurrencyInfo {...TEST_DATA[0]} />,
  KRW: <CurrencyInfo {...TEST_DATA[1]} />,
  'AED (redundant currency code)': <CurrencyInfo {...TEST_DATA[2]} />,
  BTC: <CurrencyInfo {...TEST_DATA[3]} />,
};
