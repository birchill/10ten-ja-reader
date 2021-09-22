import { getHash } from './hash';

describe('getHash', () => {
  it('hashes stuff', () => {
    expect(getHash('abcdefghijk')).toEqual('1a753336ed6e81');
  });
});
