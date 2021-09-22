import { startsWithEraName } from './years';

describe('startsWithEraName', () => {
  it('detects strings that start with an era name', () => {
    expect(startsWithEraName('令和')).toBe(true);
    expect(startsWithEraName('令和元年')).toBe(true);
    expect(startsWithEraName('令元年')).toBe(false);
    expect(startsWithEraName('令')).toBe(false);
    expect(startsWithEraName('')).toBe(false);
    expect(startsWithEraName('㋿2年')).toBe(true);
    expect(startsWithEraName('天平神護')).toBe(true);
  });
});
