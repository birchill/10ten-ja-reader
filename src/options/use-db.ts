import Bugsnag from '@birchill/bugsnag-zero';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import browser, { Runtime } from 'webextension-polyfill';

import { JpdictState } from '../background/jpdict';
import {
  DbStateUpdatedMessage,
  cancelDbUpdate,
  deleteDb,
  updateDb,
} from '../common/db-listener-messages';
import { isObject } from '../utils/is-object';

const initialDbstate: JpdictState = {
  words: { state: 'init', version: null },
  kanji: { state: 'init', version: null },
  radicals: { state: 'init', version: null },
  names: { state: 'init', version: null },
  updateState: { type: 'idle', lastCheck: null },
};

export function useDb(): {
  dbState: JpdictState;
  startDatabaseUpdate: () => void;
  cancelDatabaseUpdate: () => void;
  deleteDatabase: () => void;
} {
  const [dbState, setDbState] = useState<JpdictState>(initialDbstate);
  const browserPortRef = useRef<Runtime.Port | undefined>(undefined);

  useEffect(() => {
    let browserPort = browser.runtime.connect(undefined, { name: 'options' });
    browserPortRef.current = browserPort;

    const onMessage = (event: unknown) => {
      if (isDbStateUpdatedMessage(event)) {
        // For Runtime.Port.postMessage Chrome appears to serialize objects
        // using JSON serialization (not structured cloned). As a result, any
        // Date objects will be transformed into strings.
        //
        // Ideally we'd introduce a new type for these deserialized objects that
        // converts `Date` to `Date | string` but that is likely to take a full
        // day of TypeScript wrestling so instead we just manually reach into
        // this object and convert the fields known to possibly contain dates
        // into dates.
        if (typeof event.state.updateState.lastCheck === 'string') {
          event.state.updateState.lastCheck = new Date(
            event.state.updateState.lastCheck
          );
        }
        if (typeof event.state.updateError?.nextRetry === 'string') {
          event.state.updateError.nextRetry = new Date(
            event.state.updateError.nextRetry
          );
        }

        setDbState(event.state);
      }
    };

    // It's possible this might be disconnected on iOS which doesn't seem to
    // keep inactive ports alive. I've observed this happening on Chrome too.
    //
    // Note that according to the docs, this should not be called when _we_ call
    // disconnect():
    //
    //  https://developer.chrome.com/docs/extensions/mv3/messaging/#port-lifetime
    //
    // Nevertheless, we check that `browserPort` is not undefined before trying
    // to re-connect just in case some browsers behave differently here.
    const onDisconnect = (port: Runtime.Port) => {
      // Firefox annotates `port` with an `error` but Chrome does not.
      const error =
        isObject((port as any).error) &&
        typeof (port as any).error.message === 'string'
          ? (port as any).error.message
          : browser.runtime.lastError;
      Bugsnag.leaveBreadcrumb(
        `Options page disconnected from background page${
          error ? `: ${error}` : ''
        }`
      );
      browserPortRef.current = undefined;

      // Wait a moment and try to reconnect
      setTimeout(() => {
        try {
          // Check that browserPort is still set to _something_. If it is
          // undefined it probably means we are shutting down.
          if (!browserPort) {
            Bugsnag.leaveBreadcrumb(
              'Not reconnecting to background page because we are probably shutting down'
            );
            return;
          }
          browserPort = browser.runtime.connect(undefined, { name: 'options' });
          browserPortRef.current = browserPort;
          Bugsnag.leaveBreadcrumb(
            'Options page reconnected to background page'
          );

          browserPort.onMessage.addListener(onMessage);
          browserPort.onDisconnect.addListener(onDisconnect);
        } catch (e) {
          void Bugsnag.notify(e);
        }
      }, 700);
    };

    browserPort.onMessage.addListener(onMessage);
    browserPort.onDisconnect.addListener(onDisconnect);

    window.addEventListener('unload', () => {
      browserPort?.disconnect();
      browserPortRef.current = undefined;
    });

    return () => {
      browserPort?.disconnect();
      browserPortRef.current = undefined;
    };
  }, []);

  const startDatabaseUpdate = useCallback(() => {
    browserPortRef.current?.postMessage(updateDb());
  }, []);

  const cancelDatabaseUpdate = useCallback(() => {
    browserPortRef.current?.postMessage(cancelDbUpdate());
  }, []);

  const deleteDatabase = useCallback(() => {
    browserPortRef.current?.postMessage(deleteDb());
  }, []);

  return { dbState, startDatabaseUpdate, cancelDatabaseUpdate, deleteDatabase };
}

function isDbStateUpdatedMessage(
  event: unknown
): event is DbStateUpdatedMessage {
  return (
    isObject(event) &&
    typeof (event as any).type === 'string' &&
    (event as any).type === 'dbstateupdated'
  );
}
