import { EraInfo, EraMeta } from '../../years';

import { EraInfoComponent } from './EraInfoComponent';

const TEST_DATA: Array<{ meta: EraMeta; eraInfo: EraInfo }> = [
  {
    meta: { type: 'era', era: '令和', year: 6, matchLen: 4 },
    eraInfo: { reading: 'れいわ', start: 2019, yomi: 'Reiwa' },
  },
  {
    meta: { type: 'era', era: '令和', year: 0, matchLen: 4 },
    eraInfo: { reading: 'れいわ', start: 2019, yomi: 'Reiwa' },
  },
];

export default {
  default: <EraInfoComponent {...TEST_DATA[0]} />,
  元年: <EraInfoComponent {...TEST_DATA[1]} />,
};
