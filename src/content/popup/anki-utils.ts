/**
 * Determines whether an error message indicates an AnkiConnect connection
 * failure (as opposed to a logical Anki error like "duplicate note").
 *
 * Connection errors are produced by the `invoke` function in
 * `src/background/anki-connect.ts` when `fetchWithTimeout` rejects (Anki not
 * running, network timeout, etc.).
 */
export function isAnkiConnectionError(message: string): boolean {
  // The canonical connection-failure message from anki-connect.ts:
  //   "Could not connect to AnkiConnect. Is Anki running with the AnkiConnect add-on installed?"
  //
  // Also catch generic fetch / network errors that may surface from the
  // browser runtime message channel.
  const lower = message.toLowerCase();
  return (
    lower.includes('could not connect') ||
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network request failed') ||
    lower.includes('econnrefused')
  );
}
