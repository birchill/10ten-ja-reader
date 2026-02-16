import { describe, expect, it } from 'vitest';

import { isAnkiConnectionError } from './anki-utils';

// =========================================================================
// isAnkiConnectionError
// =========================================================================

describe('isAnkiConnectionError', () => {
  it('detects the canonical AnkiConnect connection error', () => {
    expect(
      isAnkiConnectionError(
        'Could not connect to AnkiConnect. Is Anki running with the AnkiConnect add-on installed?'
      )
    ).toBe(true);
  });

  it('detects "Failed to fetch" errors', () => {
    expect(isAnkiConnectionError('Failed to fetch')).toBe(true);
  });

  it('detects NetworkError', () => {
    expect(
      isAnkiConnectionError('NetworkError when attempting to fetch resource.')
    ).toBe(true);
  });

  it('detects network request failed', () => {
    expect(isAnkiConnectionError('Network request failed')).toBe(true);
  });

  it('detects ECONNREFUSED', () => {
    expect(isAnkiConnectionError('connect ECONNREFUSED 127.0.0.1:8765')).toBe(
      true
    );
  });

  it('is case-insensitive', () => {
    expect(isAnkiConnectionError('COULD NOT CONNECT to server')).toBe(true);
  });

  // Non-connection errors should return false
  it('returns false for an AnkiConnect logical error', () => {
    expect(
      isAnkiConnectionError('AnkiConnect error: duplicate note found')
    ).toBe(false);
  });

  it('returns false for a generic error', () => {
    expect(
      isAnkiConnectionError('Failed to add note — Anki returned null.')
    ).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isAnkiConnectionError('')).toBe(false);
  });

  it('returns false for field-related errors', () => {
    expect(
      isAnkiConnectionError('AnkiConnect error: "Expression" is not a field')
    ).toBe(false);
  });
});
