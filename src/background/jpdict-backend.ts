import {
  allMajorDataSeries,
  cancelUpdateWithRetry,
  clearCachedVersionInfo,
  DataSeries,
  JpdictIdb,
  MajorDataSeries,
  toUpdateErrorState,
  UpdateErrorState,
  updateWithRetry,
} from '@birchill/jpdict-idb';

import { requestIdleCallbackPromise } from '../utils/request-idle-callback';
import {
  JpdictEvent,
  leaveBreadcrumb,
  notifyDbStateUpdated,
  notifyDbUpdateComplete,
  notifyError,
} from './jpdict-events';
import { JpdictState } from './jpdict';

export type JpdictListener = (event: JpdictEvent) => void;

export interface JpdictBackend {
  addEventListener(listener: JpdictListener): void;
  removeEventListener(listener: JpdictListener): void;

  updateDb(params: { lang: string; force: boolean }): void;
  cancelUpdateDb(): void;
  deleteDb(): void;
  queryState(): void;
}

export class JpdictLocalBackend implements JpdictBackend {
  private db: JpdictIdb | undefined;
  private dbIsInitialized: Promise<boolean>;
  private currentUpdate:
    | {
        lang: string;
        series: MajorDataSeries;
        forceUpdate: boolean;
      }
    | undefined;

  private lastUpdateError: UpdateErrorState | undefined;
  private listeners: Array<JpdictListener> = [];

  constructor() {
    this.doDbStateNotification = this.doDbStateNotification.bind(this);
    this.dbIsInitialized = this.initDb()
      .then(() => true)
      .catch(() => false);
  }

  addEventListener(listener: JpdictListener) {
    if (!this.listeners.includes(listener)) {
      this.listeners.push(listener);
    }
  }

  removeEventListener(listener: JpdictListener) {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  async updateDb({ lang, force }: { lang: string; force: boolean }) {
    try {
      await this.updateAllSeries({ lang, forceUpdate: force });
    } catch (error) {
      this.notifyListeners(notifyError({ error }));
    }
  }

  cancelUpdateDb() {
    if (!this.currentUpdate) {
      return;
    }

    cancelUpdateWithRetry({ db: this.db!, series: this.currentUpdate.series });
    this.currentUpdate = undefined;
  }

  async deleteDb() {
    if (this.db) {
      try {
        await this.db.destroy();
      } catch (error) {
        this.notifyListeners(notifyError({ error }));
      }
    }
  }

  async queryState() {
    if (await this.dbIsInitialized) {
      this.doDbStateNotification();
    }
  }

  //
  // Implementation helpers
  //

  private async initDb(): Promise<JpdictIdb> {
    let retryCount = 0;
    while (true) {
      if (this.db) {
        try {
          await this.db.destroy();
        } catch {
          console.log('Failed to destroy previous database');
        }
      }

      try {
        this.db = new JpdictIdb({ verbose: true });
        this.db.addChangeListener(this.doDbStateNotification);

        await this.db.ready;
        return this.db;
      } catch (e) {
        if (retryCount >= 3) {
          console.log(
            'Giving up opening database. Likely in permanent private browsing mode.'
          );
          throw e;
        }
        retryCount++;
        console.log(
          `Failed to open database. Retrying shortly (attempt: ${retryCount})...`
        );
        await requestIdleCallbackPromise({ timeout: 1000 });
      }
    }
  }

  private async updateAllSeries({
    lang,
    forceUpdate,
  }: {
    lang: string;
    forceUpdate: boolean;
  }) {
    if (!(await this.dbIsInitialized)) {
      return;
    }

    // Check for a current update
    let wasForcedUpdate = false;
    if (this.currentUpdate) {
      // If the language matches and we're not (newly) forcing an update, then
      // just let the current update run.
      if (
        this.currentUpdate.lang === lang &&
        (this.currentUpdate.forceUpdate || !forceUpdate)
      ) {
        return;
      }

      // Otherwise, cancel the current update but make sure to propagate the
      // forced flag if we were forced.
      wasForcedUpdate = this.currentUpdate.forceUpdate;
      this.cancelUpdateDb();
      this.currentUpdate = undefined;
    }

    const onUpdateError =
      (series: DataSeries) =>
      (params: { error: Error; nextRetry?: Date; retryCount?: number }) => {
        const { error, nextRetry, retryCount } = params;
        if (nextRetry) {
          const diffInMs = nextRetry.getTime() - Date.now();
          this.notifyListeners(
            leaveBreadcrumb({
              message: `Encountered ${error.name} error updating ${series} database. Retrying in ${diffInMs}ms.`,
            })
          );

          // We don't want to report all download errors since the auto-retry
          // behavior will mean we get too many. Also, we don't care about
          // intermittent failures for users on flaky network connections.
          //
          // However, if a lot of clients are failing multiple times to fetch
          // a particular resource, we want to know.
          if (retryCount === 5) {
            this.notifyListeners(notifyError({ error, severity: 'warning' }));
          }
        } else if (
          error.name !== 'AbortError' &&
          error.name !== 'OfflineError'
        ) {
          this.notifyListeners(notifyError({ error }));
        } else {
          this.notifyListeners(
            leaveBreadcrumb({
              message: `Database update for ${series} database encountered ${error.name} error`,
            })
          );
        }

        this.lastUpdateError = toUpdateErrorState(params);
        this.doDbStateNotification();
      };

    const runNextUpdate = () => {
      // Check if we successfully updated a series
      if (this.currentUpdate) {
        this.lastUpdateError = undefined;
        this.notifyListeners(
          leaveBreadcrumb({
            message: `Successfully updated ${this.currentUpdate.series} database`,
          })
        );
        this.doDbStateNotification();
      }

      // Cycle through data series
      //
      // We use the following order:
      //
      // 1. Kanji
      // 2. Names
      // 3. Words
      //
      // Although the words dictionary is the most important one, we already have
      // the flat-file version available for words so, if we're going to run out
      // of disk space, it would be good to try and get as much of the other data
      // in first.
      if (!this.currentUpdate) {
        this.currentUpdate = {
          lang,
          series: 'kanji',
          forceUpdate: forceUpdate || wasForcedUpdate,
        };
      } else if (this.currentUpdate.series === 'kanji') {
        this.currentUpdate.series = 'names';
      } else if (this.currentUpdate.series === 'names') {
        this.currentUpdate.series = 'words';
      } else {
        this.currentUpdate = undefined;
        this.notifyListeners(
          notifyDbUpdateComplete(getLatestCheckTime(this.db!))
        );
        return;
      }

      if (forceUpdate || wasForcedUpdate) {
        clearCachedVersionInfo();
      }
      void updateWithRetry({
        db: this.db!,
        series: this.currentUpdate.series,
        lang,
        onUpdateComplete: runNextUpdate,
        onUpdateError: onUpdateError(this.currentUpdate.series),
      });
    };

    runNextUpdate();
  }

  private doDbStateNotification() {
    // Wait until we have finished resolving the database versions before
    // reporting anything.
    if (
      !this.db ||
      this.db.words.state === 'init' ||
      this.db.kanji.state === 'init' ||
      this.db.radicals.state === 'init' ||
      this.db.names.state === 'init'
    ) {
      return;
    }

    // Merge update states to show the current / latest update
    const lastCheck = getLatestCheckTime(this.db);
    const updateState = this.currentUpdate
      ? this.db[this.currentUpdate.series].updateState
      : { type: <const>'idle', lastCheck };

    const state: JpdictState = {
      words: {
        state: this.db.words.state,
        version: this.db.words.version,
      },
      kanji: {
        state: this.db.kanji.state,
        version: this.db.kanji.version,
      },
      radicals: {
        state: this.db.radicals.state,
        version: this.db.radicals.version,
      },
      names: {
        state: this.db.names.state,
        version: this.db.names.version,
      },
      updateState,
      updateError: this.lastUpdateError,
    };

    this.notifyListeners(notifyDbStateUpdated(state));
  }

  private notifyListeners(message: JpdictEvent) {
    const listenersCopy = this.listeners.slice();
    for (const listener of listenersCopy) {
      listener(message);
    }
  }
}

function getLatestCheckTime(db: JpdictIdb): Date | null {
  const latestCheckAsNumber = Math.max.apply(
    null,
    allMajorDataSeries.map((series) => db[series].updateState.lastCheck)
  );

  return latestCheckAsNumber !== 0 ? new Date(latestCheckAsNumber) : null;
}
