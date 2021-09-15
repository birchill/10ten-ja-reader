import Bugsnag from '@bugsnag/browser';
import * as s from 'superstruct';
import { browser } from 'webextension-polyfill-ts';

import { ExtensionStorageError } from './extension-storage-error';

export const FxLocalDataSchema = s.type({
  timestamp: s.min(s.integer(), 0),
  rates: s.record(s.string(), s.number()),
  updated: s.min(s.integer(), 0),
});

export type FxLocalData = s.Infer<typeof FxLocalDataSchema>;

export async function getLocalFxData(
  onUpdate?: (data: FxLocalData) => void
): Promise<FxLocalData | undefined> {
  if (onUpdate) {
    browser.storage.onChanged.addListener(getStorageChangeCallback(onUpdate));
  }

  try {
    const fxData = (await browser.storage.local.get('fx')).fx;
    const [error, validated] = s.validate(fxData, FxLocalDataSchema);

    if (validated) {
      return validated;
    } else if (error) {
      Bugsnag.notify(error, (event) => {
        event.severity = 'warning';
      });
    }
  } catch {
    Bugsnag.notify(
      new ExtensionStorageError({
        key: 'fxData',
        action: 'get',
      }),
      (event) => {
        event.severity = 'warning';
      }
    );
  }

  return undefined;
}

function getStorageChangeCallback(onChange: (data: FxLocalData) => void) {
  return (
    changes: Record<string, { oldValue?: unknown; newValue?: unknown }>,
    areaName: string
  ) => {
    if (areaName !== 'local') {
      return;
    }

    for (const key of Object.keys(changes)) {
      if (key === 'fx') {
        const [error, validated] = s.validate(
          changes[key].newValue,
          FxLocalDataSchema
        );

        if (validated) {
          onChange(validated);
        } else if (error) {
          Bugsnag.notify(error, (event) => {
            event.severity = 'warning';
          });
        }
      }
    }
  };
}
