import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ankiAddNote,
  ankiFindNote,
  ankiGetDecks,
  ankiGetModelFields,
  ankiGetNoteTypes,
  ankiOpenNote,
  ankiTestConnection,
} from './anki-connect';

// ---------------------------------------------------------------------------
// Mock the fetch wrapper used by anki-connect
// ---------------------------------------------------------------------------

const { mockFetchWithTimeout } = vi.hoisted(() => ({
  mockFetchWithTimeout: vi.fn(),
}));

vi.mock('../utils/fetch', () => ({ fetchWithTimeout: mockFetchWithTimeout }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simulate a successful AnkiConnect JSON response. */
function okResponse(result: unknown): Response {
  return {
    json: () => Promise.resolve({ result, error: null }),
  } as unknown as Response;
}

/** Simulate an AnkiConnect error response. */
function errorResponse(message: string): Response {
  return {
    json: () => Promise.resolve({ result: null, error: message }),
  } as unknown as Response;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockFetchWithTimeout.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// =========================================================================
// ankiTestConnection
// =========================================================================

describe('ankiTestConnection', () => {
  it('returns ok with version on success', async () => {
    mockFetchWithTimeout.mockResolvedValueOnce(okResponse(6));

    const result = await ankiTestConnection();
    expect(result).toEqual({ ok: true, version: 6 });
  });

  it('returns ok: false on network error', async () => {
    mockFetchWithTimeout.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const result = await ankiTestConnection();
    expect(result).toEqual({ ok: false });
  });
});

// =========================================================================
// ankiGetDecks
// =========================================================================

describe('ankiGetDecks', () => {
  it('returns an array of deck names', async () => {
    const decks = ['Default', 'Japanese::Vocab', 'Mining'];
    mockFetchWithTimeout.mockResolvedValueOnce(okResponse(decks));

    const result = await ankiGetDecks();
    expect(result).toEqual(decks);
  });

  it('throws on AnkiConnect error', async () => {
    mockFetchWithTimeout.mockResolvedValueOnce(
      errorResponse('collection is not available')
    );

    await expect(ankiGetDecks()).rejects.toThrow(
      'AnkiConnect error: collection is not available'
    );
  });
});

// =========================================================================
// ankiGetNoteTypes
// =========================================================================

describe('ankiGetNoteTypes', () => {
  it('returns an array of model names', async () => {
    const models = ['Basic', 'Cloze', 'Japanese'];
    mockFetchWithTimeout.mockResolvedValueOnce(okResponse(models));

    const result = await ankiGetNoteTypes();
    expect(result).toEqual(models);
  });
});

// =========================================================================
// ankiGetModelFields
// =========================================================================

describe('ankiGetModelFields', () => {
  it('returns field names for a model and passes modelName in params', async () => {
    const fields = ['Front', 'Back', 'Reading'];
    mockFetchWithTimeout.mockResolvedValueOnce(okResponse(fields));

    const result = await ankiGetModelFields('Japanese');
    expect(result).toEqual(fields);

    // Verify the request body
    const callBody = JSON.parse(
      mockFetchWithTimeout.mock.calls[0][1].body as string
    );
    expect(callBody.action).toBe('modelFieldNames');
    expect(callBody.params).toEqual({ modelName: 'Japanese' });
  });
});

// =========================================================================
// ankiAddNote
// =========================================================================

describe('ankiAddNote', () => {
  it('returns the new note ID on success', async () => {
    mockFetchWithTimeout.mockResolvedValueOnce(okResponse(1234567890));

    const result = await ankiAddNote({
      deckName: 'Japanese',
      modelName: 'Basic',
      fields: { Front: '食べる', Back: 'to eat' },
    });

    expect(result).toBe(1234567890);
  });

  it('throws when Anki returns null noteId', async () => {
    mockFetchWithTimeout.mockResolvedValueOnce(okResponse(null));

    await expect(
      ankiAddNote({
        deckName: 'Japanese',
        modelName: 'Basic',
        fields: { Front: '食べる', Back: 'to eat' },
      })
    ).rejects.toThrow('Failed to add note — Anki returned null.');
  });

  it('sends correct note structure with duplicate prevention', async () => {
    mockFetchWithTimeout.mockResolvedValueOnce(okResponse(42));

    await ankiAddNote({
      deckName: 'Mining',
      modelName: 'Cloze',
      fields: { Front: '走る', Back: 'to run' },
    });

    const callBody = JSON.parse(
      mockFetchWithTimeout.mock.calls[0][1].body as string
    );
    expect(callBody.action).toBe('addNote');
    expect(callBody.params.note).toMatchObject({
      deckName: 'Mining',
      modelName: 'Cloze',
      fields: { Front: '走る', Back: 'to run' },
      tags: ['10ten'],
      options: { allowDuplicate: false, duplicateScope: 'deck' },
    });
  });

  it('uses default tags when none provided', async () => {
    mockFetchWithTimeout.mockResolvedValueOnce(okResponse(1));

    await ankiAddNote({
      deckName: 'Default',
      modelName: 'Basic',
      fields: { Front: 'test' },
    });

    const callBody = JSON.parse(
      mockFetchWithTimeout.mock.calls[0][1].body as string
    );
    expect(callBody.params.note.tags).toEqual(['10ten']);
  });

  it('uses custom tags when provided', async () => {
    mockFetchWithTimeout.mockResolvedValueOnce(okResponse(1));

    await ankiAddNote({
      deckName: 'Default',
      modelName: 'Basic',
      fields: { Front: 'test' },
      tags: ['mining', 'vocab'],
    });

    const callBody = JSON.parse(
      mockFetchWithTimeout.mock.calls[0][1].body as string
    );
    expect(callBody.params.note.tags).toEqual(['mining', 'vocab']);
  });
});

// =========================================================================
// ankiFindNote
// =========================================================================

describe('ankiFindNote', () => {
  it('returns the first note ID when found', async () => {
    mockFetchWithTimeout.mockResolvedValueOnce(okResponse([987654]));

    const result = await ankiFindNote({
      deckName: 'Japanese',
      expression: '食べる',
      reading: 'たべる',
    });

    expect(result).toBe(987654);
  });

  it('returns null when no notes are found', async () => {
    mockFetchWithTimeout.mockResolvedValueOnce(okResponse([]));

    const result = await ankiFindNote({
      deckName: 'Japanese',
      expression: '食べる',
      reading: 'たべる',
    });

    expect(result).toBeNull();
  });

  it('constructs the correct search query', async () => {
    mockFetchWithTimeout.mockResolvedValueOnce(okResponse([]));

    await ankiFindNote({
      deckName: 'Mining Deck',
      expression: '走る',
      reading: 'はしる',
    });

    const callBody = JSON.parse(
      mockFetchWithTimeout.mock.calls[0][1].body as string
    );
    expect(callBody.action).toBe('findNotes');
    expect(callBody.params.query).toBe('"deck:Mining Deck" "走る" "はしる"');
  });
});

// =========================================================================
// ankiOpenNote
// =========================================================================

describe('ankiOpenNote', () => {
  it('sends guiBrowse with nid query', async () => {
    mockFetchWithTimeout.mockResolvedValueOnce(okResponse([12345]));

    await ankiOpenNote(12345);

    const callBody = JSON.parse(
      mockFetchWithTimeout.mock.calls[0][1].body as string
    );
    expect(callBody.action).toBe('guiBrowse');
    expect(callBody.params.query).toBe('nid:12345');
  });
});

// =========================================================================
// invoke (tested indirectly through public API)
// =========================================================================

describe('invoke error handling', () => {
  it('wraps network errors with a user-friendly message', async () => {
    mockFetchWithTimeout.mockRejectedValueOnce(new TypeError('fetch failed'));

    await expect(ankiGetDecks()).rejects.toThrow(
      'Could not connect to AnkiConnect. Is Anki running with the AnkiConnect add-on installed?'
    );
  });

  it('throws on AnkiConnect error response', async () => {
    mockFetchWithTimeout.mockResolvedValueOnce(
      errorResponse('permission denied')
    );

    await expect(ankiGetNoteTypes()).rejects.toThrow(
      'AnkiConnect error: permission denied'
    );
  });

  it('sends the correct version number in requests', async () => {
    mockFetchWithTimeout.mockResolvedValueOnce(okResponse([]));

    await ankiGetDecks();

    const callBody = JSON.parse(
      mockFetchWithTimeout.mock.calls[0][1].body as string
    );
    expect(callBody.version).toBe(6);
  });

  it('sends requests to the correct URL', async () => {
    mockFetchWithTimeout.mockResolvedValueOnce(okResponse([]));

    await ankiGetDecks();

    expect(mockFetchWithTimeout.mock.calls[0][0]).toBe('http://127.0.0.1:8765');
  });

  it('sets Content-Type header and timeout', async () => {
    mockFetchWithTimeout.mockResolvedValueOnce(okResponse([]));

    await ankiGetDecks();

    const options = mockFetchWithTimeout.mock.calls[0][1];
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(options.timeout).toBe(5000);
  });
});
