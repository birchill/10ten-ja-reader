import { MeasureMeta } from '../../measure';

import { MeasureInfo } from './MeasureInfo';

const TEST_DATA: Array<{
  meta: MeasureMeta;
  preferredUnits: 'metric' | 'imperial';
}> = [
  {
    meta: { type: 'measure', unit: 'm2', value: 60, matchLen: 3 },
    preferredUnits: 'metric',
  },
  {
    meta: { type: 'measure', unit: '畳', value: 60, matchLen: 2 },
    preferredUnits: 'metric',
  },
  {
    meta: { type: 'measure', unit: '帖', value: 60, matchLen: 2 },
    preferredUnits: 'metric',
  },
];

export default {
  'from m2': <MeasureInfo {...TEST_DATA[0]} />,
  'from 畳': <MeasureInfo {...TEST_DATA[1]} />,
  'from 帖': <MeasureInfo {...TEST_DATA[2]} />,
};
