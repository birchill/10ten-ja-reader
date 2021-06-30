jest.mock('webextension-polyfill-ts', () => ({ browser: {} }));

import { Command } from './commands';

describe('Command', () => {
  type Expected = {
    alt: boolean;
    ctrl: boolean;
    shift: boolean;
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
      key,
    };
  };

  it('parses valid command strings', () => {
    const tests = [
      { input: 'Alt+T', expected: expected(['alt'], 'T') },
      { input: 'Alt+Shift+T', expected: expected(['alt', 'shift'], 'T') },
      { input: 'F11', expected: expected([], 'F11') },
      { input: 'F1', expected: expected([], 'F1') },
      { input: 'MediaStop', expected: expected([], 'MediaStop') },
    ];
    for (const test of tests) {
      const command = Command.fromString(test.input);
      expect({
        alt: command.alt,
        ctrl: command.ctrl,
        shift: command.shift,
        key: command.key,
      }).toEqual(test.expected);
    }
  });

  it('rejects invalid command strings', () => {
    const tests = [
      'T', // No modifier
      'Alt+t', // Lowercase
      'Shift+T', // Shift can't be primary modifier
      'Alt+Shift+Ctrl+T', // Too many modifiers
      'Alt++T', // Malformed
      '+T',
      '+Alt+T',
      'Alt+T+',
      'Alt + T',
      'Alt+ T',
      'Alt +T',
      ' Alt+T',
      'Alt+T ',
      'Alt+あ', // Not in A-Z range
      'F0', // Not a valid function key
      'F13',
      'F22',
      '', // Empty key
      'Alt+',
      'Alt',
      'Alt+MediaStop', // Media key plus modifier
    ];

    for (const test of tests) {
      expect(() => {
        Command.fromString(test);
      }).toThrow();
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
      {
        input: { alt: true, shift: true, key: 'T' },
        expected: expected(['alt', 'shift'], 'T'),
      },
      { input: { key: 'F11' }, expected: expected([], 'F11') },
      { input: { key: 'F1' }, expected: expected([], 'F1') },
      { input: { key: 'MediaStop' }, expected: expected([], 'MediaStop') },
    ];
    for (const test of tests) {
      const command = Command.fromParams(test.input);
      expect({
        alt: command.alt,
        ctrl: command.ctrl,
        shift: command.shift,
        key: command.key,
      }).toEqual(test.expected);
    }
  });

  it('rejects invalid param objects', () => {
    const tests = [
      { key: 'T' }, // No modifier
      { alt: true, key: 't' }, // Lowercase
      { shift: true, key: 'T' }, // Shift can't be primary modifier
      { alt: true, shift: true, ctrl: true, key: 'T' }, // Too many modifiers
      { alt: true, key: 'あ' }, // Not in A-Z range
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
