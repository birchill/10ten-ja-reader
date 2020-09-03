import {
  DataSeries,
  DataSeriesState,
  JpdictDatabase,
  MajorDataSeries,
  UpdateErrorState,
  allMajorDataSeries,
  toUpdateErrorState,
  updateWithRetry,
  cancelUpdateWithRetry,
} from '@birchill/hikibiki-data';

import { JpdictState } from './jpdict';
import {
  notifyDbStateUpdated,
  notifyError,
  JpdictWorkerMessage,
} from './jpdict-worker-messages';
import { requestIdleCallbackPromise } from './request-idle-callback';

declare var self: DedicatedWorkerGlobalScope;

onmessage = async (evt: MessageEvent) => {
  // We seem to get random events here occasionally. Not sure where they come
  // from.
  if (!evt.data) {
    return;
  }

  switch ((evt.data as JpdictWorkerMessage).type) {
    case 'querystate':
      if (await dbIsInitialized) {
        doDbStateNotification();
      }
      break;

    case 'update':
      updateAllSeries({ lang: evt.data.lang, forceUpdate: evt.data.force });
      break;

    case 'cancelupdate':
      cancelUpdate();
      break;

    case 'delete':
      if (db) {
        db.destroy();
      }
      break;
  }
};

let db: JpdictDatabase | undefined;

const dbIsInitialized: Promise<boolean> = initDb()
  .then(() => true)
  .catch(() => false);

async function initDb(): Promise<JpdictDatabase> {
  let retryCount = 0;
  while (true) {
    if (db) {
      try {
        await db.destroy();
      } catch (e) {
        console.log('Failed to destroy previous database');
      }
    }

    db = new JpdictDatabase({ verbose: true });
    db.addChangeListener(doDbStateNotification);

    try {
      await db.ready;
      return db;
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

let currentUpdate:
  | {
      lang: string;
      series: MajorDataSeries;
      forceUpdate: boolean;
    }
  | undefined;

let lastUpdateError: UpdateErrorState | undefined;

async function updateAllSeries({
  lang,
  forceUpdate,
}: {
  lang: string;
  forceUpdate: boolean;
}) {
  if (!(await dbIsInitialized)) {
    return;
  }

  // Check for a current update
  let wasForcedUpdate = false;
  if (currentUpdate) {
    // If the language matches and we're not (newly) forcing an update, then
    // just let the current update run.
    if (
      currentUpdate.lang === lang &&
      (currentUpdate.forceUpdate || !forceUpdate)
    ) {
      return;
    }

    // Otherwise, cancel the current update but make sure to propagate the
    // forced flag if we were forced.
    wasForcedUpdate = currentUpdate.forceUpdate;
    cancelUpdate();
    currentUpdate = undefined;
  }

  const onUpdateError = (params: {
    series: DataSeries;
    error: Error;
    nextRetry?: Date;
    retryCount?: number;
  }) => {
    const { series, error, nextRetry, retryCount } = params;
    if (nextRetry) {
      const diffInMs = nextRetry.getTime() - Date.now();
      self.postMessage(
        notifyError({
          error: `Encountered ${error.name} error updating ${series} database. Retrying in ${diffInMs}ms.`,
          severity: 'warning',
        })
      );

      // We don't want to report all download errors since the auto-retry
      // behavior will mean we get too many. Also, we don't care about
      // intermittent failures for users on flaky network connections.
      //
      // However, if a lot of clients are failing multiple times to fetch
      // a particular resource, we want to know.
      if (retryCount === 5) {
        self.postMessage(notifyError({ error, severity: 'warning' }));
      }
    } else if (error.name !== 'AbortError' && error.name !== 'OfflineError') {
      self.postMessage(notifyError({ error }));
    } else {
      self.postMessage(
        notifyError({
          error: `Kanji database update encountered ${error.name} error`,
          severity: 'breadcrumb',
        })
      );
    }

    lastUpdateError = toUpdateErrorState(params);
    doDbStateNotification();
  };

  const runNextUpdate = () => {
    // Check if we successfully updated a series
    if (currentUpdate) {
      lastUpdateError = undefined;
      self.postMessage(
        notifyError({
          error: `Successfully updated ${currentUpdate.series} database`,
          severity: 'breadcrumb',
        })
      );
      doDbStateNotification();
    }

    // Cycle through data series
    if (!currentUpdate) {
      currentUpdate = {
        lang,
        series: 'kanji',
        forceUpdate: forceUpdate || wasForcedUpdate,
      };
    } else if (currentUpdate.series === 'kanji') {
      currentUpdate.series = 'names';
    } else {
      currentUpdate = undefined;
      return;
    }

    updateWithRetry({
      db: db!,
      series: currentUpdate.series,
      lang,
      forceUpdate: forceUpdate || wasForcedUpdate,
      onUpdateComplete: runNextUpdate,
      onUpdateError,
    });
  };

  runNextUpdate();
}

function cancelUpdate() {
  if (!currentUpdate) {
    return;
  }

  cancelUpdateWithRetry({ db: db!, series: currentUpdate.series });
}

function doDbStateNotification() {
  // Wait until we have finished resolving the database versions before
  // reporting anything.
  if (
    !db ||
    db.kanji.state === DataSeriesState.Initializing ||
    db.radicals.state === DataSeriesState.Initializing ||
    db.names.state === DataSeriesState.Initializing
  ) {
    return;
  }

  // Merge update states to show the current / latest update
  const lastCheck = new Date(
    Math.max.apply(
      null,
      allMajorDataSeries.map((series) => db![series].updateState.lastCheck)
    )
  );

  const updateState = currentUpdate
    ? db[currentUpdate.series].updateState
    : { state: <const>'idle', lastCheck };

  const state: JpdictState = {
    kanji: {
      state: db.kanji.state,
      version: db.kanji.version,
    },
    radicals: {
      state: db.radicals.state,
      version: db.radicals.version,
    },
    names: {
      state: db.names.state,
      version: db.names.version,
    },
    updateState,
    updateError: lastUpdateError,
  };

  try {
    self.postMessage(notifyDbStateUpdated(state));
  } catch (e) {
    console.log('Error posting message');
    console.log(e);
  }
}
