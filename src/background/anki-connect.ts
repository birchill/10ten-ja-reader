import { fetchWithTimeout } from '../utils/fetch';

const ANKI_CONNECT_URL = 'http://127.0.0.1:8765';
const ANKI_CONNECT_VERSION = 6;

// ---------------------------------------------------------------------------
// Low-level invoke
// ---------------------------------------------------------------------------

interface AnkiConnectRequest {
  action: string;
  version: number;
  params?: Record<string, unknown>;
}

interface AnkiConnectResponse {
  result: unknown;
  error: string | null;
}

async function invoke<T = unknown>(
  action: string,
  params?: Record<string, unknown>
): Promise<T> {
  const body: AnkiConnectRequest = {
    action,
    version: ANKI_CONNECT_VERSION,
    ...(params ? { params } : {}),
  };

  let response: Response;
  try {
    response = await fetchWithTimeout(ANKI_CONNECT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      timeout: 5000,
    });
  } catch {
    throw new Error(
      'Could not connect to AnkiConnect. Is Anki running with the AnkiConnect add-on installed?'
    );
  }

  const json = (await response.json()) as AnkiConnectResponse;

  if (json.error) {
    throw new Error(`AnkiConnect error: ${json.error}`);
  }

  return json.result as T;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Test that AnkiConnect is reachable and return its version number. */
export async function ankiTestConnection(): Promise<{
  ok: boolean;
  version?: number;
}> {
  try {
    const version = await invoke<number>('version');
    return { ok: true, version };
  } catch {
    return { ok: false };
  }
}

/** Get the list of deck names. */
export async function ankiGetDecks(): Promise<Array<string>> {
  return invoke<Array<string>>('deckNames');
}

/** Get the list of note type (model) names. */
export async function ankiGetNoteTypes(): Promise<Array<string>> {
  return invoke<Array<string>>('modelNames');
}

/** Get the field names for a given note type (model). */
export async function ankiGetModelFields(modelName: string): Promise<Array<string>> {
  return invoke<Array<string>>('modelFieldNames', { modelName });
}

/** Add a note to Anki. Returns the new note ID. */
export async function ankiAddNote(params: {
  deckName: string;
  modelName: string;
  fields: Record<string, string>;
  tags?: Array<string>;
}): Promise<number> {
  const noteId = await invoke<number | null>('addNote', {
    note: {
      deckName: params.deckName,
      modelName: params.modelName,
      fields: params.fields,
      tags: params.tags ?? ['10ten'],
      options: { allowDuplicate: false, duplicateScope: 'deck' },
    },
  });

  if (noteId === null) {
    throw new Error('Failed to add note — Anki returned null.');
  }

  return noteId;
}

/**
 * Find a note in the given deck that matches the expression and reading.
 * Returns the note ID if found, or null.
 */
export async function ankiFindNote(params: {
  deckName: string;
  expression: string;
  reading: string;
}): Promise<number | null> {
  // Build a query that searches within the specified deck.
  // We search across all fields for both expression and reading since
  // we don't know exactly which field names the user has chosen.
  const query = `"deck:${params.deckName}" "${params.expression}" "${params.reading}"`;
  const noteIds = await invoke<Array<number>>('findNotes', { query });
  return noteIds.length > 0 ? noteIds[0] : null;
}

/** Open the Anki browser showing the given note. */
export async function ankiOpenNote(noteId: number): Promise<void> {
  await invoke<Array<number>>('guiBrowse', { query: `nid:${noteId}` });
}
