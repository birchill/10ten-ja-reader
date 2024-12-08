import { EraInfoTimeSpan, EraMeta } from '../../dates';

import { EraInfoComponent } from './EraInfoComponent';

const TEST_DATA: Record<string, { meta: EraMeta; timeSpan?: EraInfoTimeSpan }> =
  {
    'timespan for year': {
      meta: {
        type: 'era',
        era: '明治',
        reading: 'めいじ',
        year: 2,
        matchLen: 4,
      },
    },
    'timespan for month': {
      meta: {
        type: 'era',
        era: '明治',
        reading: 'めいじ',
        year: 3,
        month: -10,
        matchLen: 6,
      },
    },
    'full calculated date': {
      meta: {
        type: 'era',
        era: '明治',
        reading: 'めいじ',
        year: 2,
        month: 6,
        day: 25,
        matchLen: 9,
      },
    },
    'gregorian year only': {
      meta: {
        type: 'era',
        era: '令和',
        reading: 'れいわ',
        year: 6,
        matchLen: 4,
      },
    },
    'gregorian with month': {
      meta: {
        type: 'era',
        era: '令和',
        reading: 'れいわ',
        year: 6,
        month: 12,
        matchLen: 7,
      },
    },
    'gregorian full date': {
      meta: {
        type: 'era',
        era: '令和',
        reading: 'れいわ',
        year: 6,
        month: 12,
        day: 1,
        matchLen: 9,
      },
    },
    元年: {
      meta: {
        type: 'era',
        era: '令和',
        reading: 'れいわ',
        year: 0,
        matchLen: 4,
      },
    },
    invalid: {
      meta: {
        type: 'era',
        era: '安政',
        reading: 'あんせい',
        year: 99,
        matchLen: 5,
      },
    },
  };

export default Object.fromEntries(
  Object.entries(TEST_DATA).map(([description, data]) => [
    description,
    <EraInfoComponent {...data} key={description} />,
  ])
);
