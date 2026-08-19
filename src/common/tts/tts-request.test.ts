import { describe, expect, it } from 'vitest';

import { buildTtsFilename } from './tts-request';

describe('buildTtsFilename', () => {
  it('encodes reading only', () => {
    expect(buildTtsFilename({ reading: 'すごい' })).toBe(
      `${encodeURIComponent('すごい')}.mp3`
    );
  });

  it('encodes reading + pitchAccentPos as a 2-field path', () => {
    expect(buildTtsFilename({ reading: 'あめ', pitchAccentPos: 1 })).toBe(
      `${encodeURIComponent('あめ')},1.mp3`
    );
  });

  it('includes pitchAccentPos of 0 (heiban)', () => {
    expect(buildTtsFilename({ reading: 'いる', pitchAccentPos: 0 })).toBe(
      `${encodeURIComponent('いる')},0.mp3`
    );
  });

  it('encodes kanji + reading as a 2-field path (kanji first)', () => {
    expect(buildTtsFilename({ reading: 'たべる', kanji: '食べる' })).toBe(
      `${encodeURIComponent('食べる')},${encodeURIComponent('たべる')}.mp3`
    );
  });

  it('encodes kanji + reading + pitchAccentPos as a 3-field path', () => {
    expect(
      buildTtsFilename({ reading: 'はいる', kanji: '入る', pitchAccentPos: 1 })
    ).toBe(
      `${encodeURIComponent('入る')},${encodeURIComponent('はいる')},1.mp3`
    );
  });

  it('percent-encodes reserved characters, the field separator included', () => {
    expect(buildTtsFilename({ kanji: 'a/b?c#d&e', reading: 'f,g' })).toBe(
      'a%2Fb%3Fc%23d%26e,f%2Cg.mp3'
    );
  });
});
