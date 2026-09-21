/**
 * @vitest-environment jsdom
 */
import { JpdictIdb, updateWithRetry } from '@birchill/jpdict-idb';
import type * as JpdictModule from '@birchill/jpdict-idb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { JpdictState } from './jpdict';
import { JpdictLocalBackend } from './jpdict-backend';
import type { JpdictEvent } from './jpdict-events';

// Keep real IndexedDB initialization and deletion, but inject update outcomes
// instead of downloading the dictionary. fake-indexeddb cannot simulate damaged
// on-disk files, so the corruption error is injected at the update boundary.
vi.mock('@birchill/jpdict-idb', async (importOriginal) => ({
  ...(await importOriginal<typeof JpdictModule>()),
  updateWithRetry: vi.fn<typeof updateWithRetry>(),
}));

describe('dictionary corruption recovery', () => {
  let backend: JpdictLocalBackend;
  let state: JpdictState;
  let events: Array<JpdictEvent>;

  beforeEach(async () => {
    events = [];
    backend = new JpdictLocalBackend();
    backend.addEventListener((event) => {
      events.push(event);
      if (event.type === 'dbstateupdated') {
        state = event.state;
      }
    });
    await backend.queryState();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.mocked(updateWithRetry).mockReset();
    await backend.deleteDb();
  });

  function currentUpdate() {
    return vi.mocked(updateWithRetry).mock.lastCall![0];
  }

  async function failUpdate(name = 'NotReadableError') {
    await backend.updateDb({ lang: 'ja', force: false });
    currentUpdate().onUpdateError!({
      error: new DOMException('Cannot read dictionary data', name),
    });
  }

  it('waits for a forced update before rebuilding', async () => {
    await backend.updateDb({ lang: 'ja', force: false });
    currentUpdate().onUpdateComplete!();
    currentUpdate().onUpdateError!({
      error: new DOMException(
        'Cannot read dictionary data',
        'NotReadableError'
      ),
    });

    expect(state.updateError?.name).toBe('NotReadableError');
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'error', name: 'NotReadableError' })
    );

    const destroy = vi.spyOn(JpdictIdb.prototype, 'destroy');
    await backend.updateDb({ lang: 'ja', force: false });
    expect(destroy).not.toHaveBeenCalled();
    expect(updateWithRetry).toHaveBeenCalledTimes(2);
  });

  it('deletes stored data before restarting all series in the selected language', async () => {
    await failUpdate();
    const request = indexedDB.open('jpdict');
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = database.transaction('words', 'readwrite');
    transaction.objectStore('words').put({ id: 1, r: ['test'], s: [] });
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();

    const db = currentUpdate().db;
    await backend.updateDb({ lang: 'ja', force: true });
    await backend.queryState();
    expect(state.updateError).toBeUndefined();
    expect(state.words).toEqual({ state: 'empty', version: null });

    // Deletion removes the database itself, not just its version metadata.
    expect(await indexedDB.databases()).not.toContainEqual(
      expect.objectContaining({ name: 'jpdict' })
    );
    for (const series of ['kanji', 'names', 'words']) {
      expect(currentUpdate()).toMatchObject({ db, series, lang: 'ja' });
      currentUpdate().onUpdateComplete!();
    }

    const destroy = vi.spyOn(JpdictIdb.prototype, 'destroy');
    await backend.updateDb({ lang: 'ja', force: true });
    expect(destroy).not.toHaveBeenCalled();
  });

  it('serializes recovery and ignores other updates while deletion is pending', async () => {
    await failUpdate();
    const db = currentUpdate().db;
    const originalDestroy = db.destroy.bind(db);
    let finishDeletion!: () => void;
    const pending = new Promise<void>((resolve) => {
      finishDeletion = resolve;
    });
    const destroy = vi
      .spyOn(JpdictIdb.prototype, 'destroy')
      .mockImplementation(async () => {
        await pending;
        await originalDestroy();
      });

    const rebuilding = backend.updateDb({ lang: 'ja', force: true });
    await vi.waitFor(() => expect(destroy).toHaveBeenCalledOnce());
    await backend.updateDb({ lang: 'ja', force: true });
    await backend.updateDb({ lang: 'en', force: true });
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(updateWithRetry).toHaveBeenCalledTimes(1);

    finishDeletion();
    await rebuilding;
    expect(updateWithRetry).toHaveBeenCalledTimes(2);
  });

  it('keeps recovery available if deletion fails, without starting a download', async () => {
    await failUpdate();
    vi.spyOn(JpdictIdb.prototype, 'destroy').mockRejectedValueOnce(
      new DOMException('Deletion failed', 'UnknownError')
    );
    await backend.updateDb({ lang: 'ja', force: true });
    expect(state.updateError?.name).toBe('UnknownError');
    expect(updateWithRetry).toHaveBeenCalledTimes(1);
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'error', name: 'UnknownError' })
    );

    await backend.updateDb({ lang: 'ja', force: true });
    expect(updateWithRetry).toHaveBeenCalledTimes(2);
  });

  it.each(['UnknownError', 'QuotaExceededError', 'OfflineError'])(
    'does not offer or perform a rebuild for %s',
    async (name) => {
      await failUpdate(name);
      const destroy = vi.spyOn(JpdictIdb.prototype, 'destroy');
      await backend.updateDb({ lang: 'ja', force: true });
      expect(destroy).not.toHaveBeenCalled();
    }
  );

  it('requires another explicit request if corruption recurs after rebuilding', async () => {
    await failUpdate();
    await backend.updateDb({ lang: 'ja', force: true });
    currentUpdate().onUpdateError!({
      error: new DOMException('Still unreadable', 'NotReadableError'),
    });
    expect(state.updateError?.name).toBe('NotReadableError');
    const destroy = vi.spyOn(JpdictIdb.prototype, 'destroy');
    await backend.updateDb({ lang: 'ja', force: false });
    expect(destroy).not.toHaveBeenCalled();
  });
});
