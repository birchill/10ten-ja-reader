// sort-imports-ignore

import { describe, expect, it, vi } from 'vitest';

vi.mock('webextension-polyfill', () => ({
  default: { i18n: { getMessage: (key: string) => key } },
}));

import { Command } from './commands';

describe('Command', () => {
  type Expected = {
    alt: boolean;
    ctrl: boolean;
    shift: boolean;
    macCtrl: boolean;
    key: string;
  };
  const expected = (
    modifiers: Array<keyof Expected>,
    key: string
  ): Expected => {
    return {
      alt: modifiers.includes('alt'),
      ctrl: modifiers.includes('ctrl'),
      shift: modifiers.includes('shift'),
      macCtrl: modifiers.includes('macCtrl'),
      key,
    };
  };

  it('parses valid command strings', () => {
    const tests = [
      { input: 'Alt+T', expected: expected(['alt'], 'T') },
      { input: 'ALT+T', expected: expected(['alt'], 'T') },
      { input: 'Alt+t', expected: expected(['alt'], 'T') },
      { input: 'Alt+Shift+T', expected: expected(['alt', 'shift'], 'T') },
      { input: 'Alt + Shift + T', expected: expected(['alt', 'shift'], 'T') },
      { input: 'F11', expected: expected([], 'F11') },
      { input: 'F1', expected: expected([], 'F1') },
      { input: 'MediaStop', expected: expected([], 'MediaStop') },
      // Chrome on Mac does this �‍♂️
      { input: '⌥⇧R', expected: expected(['alt', 'shift'], 'R') },
      { input: '⌃⌘R', expected: expected(['macCtrl', 'ctrl'], 'R') },
      { input: '⌃⇧R', expected: expected(['macCtrl', 'shift'], 'R') },
      { input: '⇧⌘K', expected: expected(['ctrl', 'shift'], 'K') },
      // We've seen this on Edge at least once
      { input: 'Alternatif+T', expected: expected(['alt'], 'T') },
      // And this on Opera
      { input: 'Strg + R', expected: expected(['ctrl'], 'R') },
    ];
    for (const test of tests) {
      let command: Command;
      expect(() => {
        command = Command.fromString(test.input);
      }).not.toThrow();
      expect({
        alt: command!.alt,
        ctrl: command!.ctrl,
        shift: command!.shift,
        macCtrl: command!.macCtrl,
        key: command!.key,
      }).toEqual(test.expected);
    }
  });

  it('rejects invalid command strings', () => {
    const tests = [
      'T', // No modifier
      'Shift+T', // Shift can't be primary modifier
      'Alt+Shift+Ctrl+T', // Too many modifiers
      '+T',
      'F0', // Not a valid function key
      'F13',
      'F22',
      '', // Empty key
      'Alt+',
      'Alt',
    ];

    for (const test of tests) {
      expect(() => {
        Command.fromString(test);
      }).toThrow();
    }
  });

  it('allows but indicates invalid keys', () => {
    const tests = [
      'Alt+あ', // Not in A-Z range
      'Alt+MediaStop', // Media key plus modifier
    ];

    for (const test of tests) {
      expect(Command.fromString(test).isValid()).toBe(false);
    }
  });

  it('roundtrips valid command strings', () => {
    const tests = ['Alt+T', 'Alt+Shift+T', 'F11', 'F1', 'MediaStop'];
    for (const test of tests) {
      const command = Command.fromString(test);
      expect(command.toString()).toEqual(test);
    }
  });

  it('handles valid param objects', () => {
    const tests = [
      { input: { alt: true, key: 'T' }, expected: expected(['alt'], 'T') },
      { input: { alt: true, key: 't' }, expected: expected(['alt'], 'T') },
      {
        input: { alt: true, shift: true, key: 'T' },
        expected: expected(['alt', 'shift'], 'T'),
      },
      { input: { key: 'F11' }, expected: expected([], 'F11') },
      { input: { key: 'F1' }, expected: expected([], 'F1') },
      { input: { key: 'MediaStop' }, expected: expected([], 'MediaStop') },
      {
        input: { ctrl: true, macCtrl: true, key: 'R' },
        expected: expected(['ctrl', 'macCtrl'], 'R'),
      },
    ];
    for (const test of tests) {
      const command = Command.fromParams(test.input);
      expect({
        alt: command.alt,
        ctrl: command.ctrl,
        shift: command.shift,
        macCtrl: command.macCtrl,
        key: command.key,
      }).toEqual(test.expected);
    }
  });

  it('rejects invalid param objects', () => {
    const tests = [
      { key: 'T' }, // No modifier
      { shift: true, key: 'T' }, // Shift can't be primary modifier
      { alt: true, shift: true, ctrl: true, key: 'T' }, // Too many modifiers
      { key: 'F0' }, // No modifier
      { key: 'F13' },
      { key: 'F22' },
      { key: '' }, // Empty key
      { key: 'MediaStop', alt: true }, // Media key and modifier
    ];

    for (const test of tests) {
      expect(() => {
        Command.fromParams(test);
      }).toThrow();
    }
  });
});
