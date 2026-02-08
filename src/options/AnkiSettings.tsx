import { useCallback, useEffect, useState } from 'preact/hooks';
import browser from 'webextension-polyfill';

import type { Config } from '../common/config';

import { SectionHeading } from './SectionHeading';
import { useConfigValue } from './use-config-value';

/** The 10ten fields available for mapping to Anki note type fields. */
const TENKEN_FIELDS = ['Expression', 'Reading', 'Meaning', 'Sentence'] as const;

type Props = { config: Config };

export function AnkiSettings(props: Props) {
  const ankiEnabled = useConfigValue(props.config, 'ankiEnabled');
  const ankiDeck = useConfigValue(props.config, 'ankiDeck');
  const ankiNoteType = useConfigValue(props.config, 'ankiNoteType');
  const ankiFieldMapping = useConfigValue(props.config, 'ankiFieldMapping');

  // ---------- Remote data from AnkiConnect ----------

  const [decks, setDecks] = useState<Array<string>>([]);
  const [noteTypes, setNoteTypes] = useState<Array<string>>([]);
  const [modelFields, setModelFields] = useState<Array<string>>([]);

  // ---------- Connection test ----------

  const [connectionStatus, setConnectionStatus] = useState<
    'idle' | 'testing' | 'ok' | 'error'
  >('idle');

  const testConnection = useCallback(async () => {
    setConnectionStatus('testing');
    try {
      const result = (await browser.runtime.sendMessage({
        type: 'ankiTestConnection',
      })) as { ok: boolean; version?: number };
      setConnectionStatus(result.ok ? 'ok' : 'error');
    } catch {
      setConnectionStatus('error');
    }
  }, []);

  // ---------- Fetch decks & note types when enabled ----------

  useEffect(() => {
    if (!ankiEnabled) {
      return;
    }

    (async () => {
      try {
        const [deckList, noteTypeList] = (await Promise.all([
          browser.runtime.sendMessage({ type: 'ankiGetDecks' }),
          browser.runtime.sendMessage({ type: 'ankiGetNoteTypes' }),
        ])) as [Array<string>, Array<string>];
        setDecks(deckList);
        setNoteTypes(noteTypeList);
      } catch {
        // AnkiConnect not reachable — leave lists empty
      }
    })();
  }, [ankiEnabled]);

  // ---------- Fetch model fields when note type changes ----------

  useEffect(() => {
    if (!ankiNoteType) {
      setModelFields([]);
      return;
    }

    (async () => {
      try {
        const fields = (await browser.runtime.sendMessage({
          type: 'ankiGetModelFields',
          model: ankiNoteType,
        })) as Array<string>;
        setModelFields(fields);
      } catch {
        setModelFields([]);
      }
    })();
  }, [ankiNoteType]);

  // ---------- Handlers ----------

  const onToggleEnabled = useCallback(
    (e: Event) => {
      props.config.ankiEnabled = (e.target as HTMLInputElement).checked;
    },
    [props.config]
  );

  const onChangeDeck = useCallback(
    (e: Event) => {
      props.config.ankiDeck = (e.target as HTMLSelectElement).value;
    },
    [props.config]
  );

  const onChangeNoteType = useCallback(
    (e: Event) => {
      const newNoteType = (e.target as HTMLSelectElement).value;
      props.config.ankiNoteType = newNoteType;
      // Reset field mapping when note type changes
      props.config.ankiFieldMapping = {};
    },
    [props.config]
  );

  const onChangeFieldMapping = useCallback(
    (tentenField: string, ankiField: string) => {
      const updated = { ...ankiFieldMapping };
      if (ankiField) {
        updated[tentenField] = ankiField;
      } else {
        delete updated[tentenField];
      }
      props.config.ankiFieldMapping = updated;
    },
    [props.config, ankiFieldMapping]
  );

  // ---------- Render ----------

  return (
    <>
      <SectionHeading>Anki</SectionHeading>
      <div class="space-y-4 py-4">
        {/* Enable toggle */}
        <label class="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={ankiEnabled}
            onInput={onToggleEnabled}
          />
          <span>Enable Anki integration (via AnkiConnect)</span>
        </label>

        {ankiEnabled && (
          <>
            {/* Test connection */}
            <div class="flex items-center gap-3">
              <button
                type="button"
                class="cursor-pointer rounded border px-3 py-1 text-sm"
                onClick={testConnection}
                disabled={connectionStatus === 'testing'}
              >
                {connectionStatus === 'testing'
                  ? 'Testing...'
                  : 'Test Connection'}
              </button>
              {connectionStatus === 'ok' && (
                <span class="text-sm text-green-600">
                  ✓ Connected to AnkiConnect
                </span>
              )}
              {connectionStatus === 'error' && (
                <span class="text-sm text-red-600">
                  ✗ Could not connect. Is Anki running with AnkiConnect
                  installed?
                </span>
              )}
            </div>

            {/* Deck selector */}
            <div class="space-y-1">
              <label for="ankiDeck" class="block text-sm font-medium">
                Deck
              </label>
              <select
                id="ankiDeck"
                class="w-full rounded border p-1.5"
                onInput={onChangeDeck}
              >
                <option value="" selected={!ankiDeck}>
                  — Select a deck —
                </option>
                {decks.map((d) => (
                  <option key={d} value={d} selected={d === ankiDeck}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Note type selector */}
            <div class="space-y-1">
              <label for="ankiNoteType" class="block text-sm font-medium">
                Note type
              </label>
              <select
                id="ankiNoteType"
                class="w-full rounded border p-1.5"
                onInput={onChangeNoteType}
              >
                <option value="" selected={!ankiNoteType}>
                  — Select a note type —
                </option>
                {noteTypes.map((nt) => (
                  <option key={nt} value={nt} selected={nt === ankiNoteType}>
                    {nt}
                  </option>
                ))}
              </select>
            </div>

            {/* Field mapping */}
            {ankiNoteType && modelFields.length > 0 && (
              <div class="space-y-2">
                <p class="text-sm font-medium">Field mapping</p>
                <table class="w-full text-sm">
                  <thead>
                    <tr class="text-left">
                      <th class="pr-4 pb-1 font-medium">10ten field</th>
                      <th class="pb-1 font-medium">Anki field</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TENKEN_FIELDS.map((tf) => (
                      <tr key={tf}>
                        <td class="py-1 pr-4">{tf}</td>
                        <td class="py-1">
                          <select
                            class="w-full rounded border p-1"
                            onInput={(e) => {
                              onChangeFieldMapping(
                                tf,
                                (e.target as HTMLSelectElement).value
                              );
                            }}
                          >
                            <option value="" selected={!ankiFieldMapping[tf]}>
                              — Skip —
                            </option>
                            {modelFields.map((mf) => (
                              <option
                                key={mf}
                                value={mf}
                                selected={ankiFieldMapping[tf] === mf}
                              >
                                {mf}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
