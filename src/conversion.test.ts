import { normalizeInput } from './conversion';

describe('normalizeInput', () => {
  it('trims input at the first out-of-range character', () => {
    expect(normalizeInput('ｶﾞｰﾃﾞﾝ。')).toEqual(['ガーデン', [0, 2, 3, 5, 6]]);
  });
});
