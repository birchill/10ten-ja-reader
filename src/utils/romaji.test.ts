import { describe, expect, it } from 'vitest';

import { toRomaji } from './romaji';

describe('toRomaji', () => {
  it('converts hiragana', () => {
    expect(toRomaji('こんにちは')).toEqual('konnichiha');
    expect(toRomaji('にんじゃりばんばん')).toEqual('ninjaribanban');

    // This would normally be in katakana but people do crazy things
    expect(toRomaji('ふぁみま')).toEqual('famima');

    // Hepburn would actually make these both use ō but that's silly.
    // They are pronounced differently. (In 大阪 the double 'o' is actually
    // pronounced as two distinct 'o' sounds, not as a 長音.)
    expect(toRomaji('とうきょう')).toEqual('toukyou');
    expect(toRomaji('おおさか')).toEqual('oosaka');

    // Someone will likely come along and try to fix this library to produce the
    // expected long-vowel sounds. That's nice. But please note that in the
    // following みずうみ should continues to produce 'mizuumi' while すうがく
    // should produce 'sūgaku'. For now doing that is too hard so we just double
    // up the letters. Pretty much every library I could find also does this.
    expect(toRomaji('みずうみ')).toEqual('mizuumi');
    expect(toRomaji('すうがく')).toEqual('suugaku');
  });

  it('handles っ', () => {
    expect(toRomaji('すっごくいい')).toEqual('suggokuii');
    expect(toRomaji('すっっっごくいい')).toEqual('suggggokuii');

    // From Wikipedia
    expect(toRomaji('けっか')).toEqual('kekka');
    expect(toRomaji('さっさと')).toEqual('sassato');
    expect(toRomaji('ずっと')).toEqual('zutto');
    expect(toRomaji('きっぷ')).toEqual('kippu');
    expect(toRomaji('いっしょ')).toEqual('issho');
    expect(toRomaji('こっち')).toEqual('kotchi');
    expect(toRomaji('まっちゃ')).toEqual('matcha');
    expect(toRomaji('みっつ')).toEqual('mittsu');
  });

  it('handles final っ', () => {
    expect(toRomaji('あつっ')).toEqual("atsu'");
    expect(toRomaji('あつっっっ')).toEqual("atsu'''");
    expect(toRomaji('あつっ!')).toEqual("atsu'!");
    expect(toRomaji('あつっ！')).toEqual("atsu'！");
  });

  it('separates ん from a following vowel', () => {
    expect(toRomaji('かんいかきとめ')).toEqual('kan-ikakitome');
    expect(toRomaji('まんゑ')).toEqual('man-e');
  });

  it('converts katakana', () => {
    expect(toRomaji('ハロー')).toEqual('haro-');
  });

  it('preserves other characters as-is (as-are?)', () => {
    expect(toRomaji('AえいBびーCしー！')).toEqual('AeiBbi-Cshi-！');
  });

  it('converts maniac kana', () => {
    expect(toRomaji('ゟ')).toEqual('yori');
    expect(toRomaji('ヿ')).toEqual('koto');
  });
});
