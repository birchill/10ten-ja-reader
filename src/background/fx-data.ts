import Bugsnag from '@birchill/bugsnag-zero';
import * as s from 'superstruct';
import browser from 'webextension-polyfill';

const FxLocalDataSchema = s.type({
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
    const fxData = (await browser.storage.local.get('fx'))?.fx;
    if (!fxData) {
      return undefined;
    }
    const [error, validated] = s.validate(fxData, FxLocalDataSchema);

    if (validated) {
      return validated;
    } else {
      void Bugsnag.notify(error, { severity: 'warning' });
    }
  } catch {
    console.warn('Failed to get fx data from storage');
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

    if ('fx' in changes) {
      const [error, validated] = s.validate(
        changes.fx.newValue,
        FxLocalDataSchema
      );

      if (validated) {
        onChange(validated);
      } else {
        void Bugsnag.notify(error, { severity: 'warning' });
      }
    }
  };
}
