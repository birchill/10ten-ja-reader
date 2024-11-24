import { NumberMeta } from '../../numbers';

import { NumberInfo } from './NumberInfo';

const TEST_DATA: Array<{ meta: NumberMeta; isCombinedResult: boolean }> = [
  {
    meta: { type: 'number', value: 98, src: '九十八', matchLen: 3 },
    isCombinedResult: true,
  },
  {
    meta: { type: 'number', value: 88000, src: '8万8千', matchLen: 5 },
    isCombinedResult: false,
  },
];

export default {
  combined: <NumberInfo {...TEST_DATA[0]} />,
  'in isolation': <NumberInfo {...TEST_DATA[1]} />,
};
