// @vitest-environment jsdom
import { webcrypto } from 'node:crypto';
import { Fragment, h, render } from 'preact';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Permissions, Storage } from 'webextension-polyfill';

import type { ReportingService } from '../background/reporting';
import type { PreparedReport } from '../common/prepared-report';

import { ErrorReportingNotice } from './ErrorReportingNotice';
import { ErrorReportingSettingsForm } from './ErrorReportingSettingsForm';
import { useReporting } from './use-reporting';

const mocks = vi.hoisted(() => {
  function event<Args extends Array<unknown>>() {
    const listeners = new Set<(...args: Args) => void>();
    return {
      addListener: (listener: (...args: Args) => void) => {
        listeners.add(listener);
      },
      removeListener: (listener: (...args: Args) => void) => {
        listeners.delete(listener);
      },
      emit: (...args: Args) => {
        for (const listener of Array.from(listeners)) {
          listener(...args);
        }
      },
    };
  }

  return {
    event,
    granted: [] as Array<string>,
    nativeSupport: true,
    getAll: { pending: undefined as Promise<void> | undefined },
    request: vi.fn<() => Promise<boolean>>(),
    remove: vi.fn<() => Promise<boolean>>(),
    onAdded: event<[Permissions.Permissions]>(),
    onRemoved: event<[Permissions.Permissions]>(),
    stored: {} as Record<string, unknown>,
    set: vi.fn<(values: Record<string, unknown>) => Promise<void>>(),
    managed: {} as Record<string, unknown>,
    onChanged: event<[Record<string, Storage.StorageChange>, string]>(),
    sendMessage: vi.fn<(message: unknown) => Promise<unknown>>(),
  };
});

vi.mock('webextension-polyfill', () => {
  const clone = <T>(value: T): T =>
    value === undefined ? value : JSON.parse(JSON.stringify(value));
  const write = (values: Record<string, unknown>) => {
    const changes: Record<string, Storage.StorageChange> = {};
    for (const [key, value] of Object.entries(values)) {
      changes[key] = { oldValue: mocks.stored[key], newValue: clone(value) };
      mocks.stored[key] = clone(value);
    }
    mocks.onChanged.emit(changes, 'local');
  };
  mocks.set.mockImplementation(async (values) => write(values));

  return {
    default: {
      i18n: {
        getMessage: (key: string, substitutions?: string | Array<string>) =>
          substitutions === undefined
            ? key
            : `${key}(${([] as Array<string>).concat(substitutions).join('|')})`,
      },
      permissions: {
        getAll: async () => {
          await mocks.getAll.pending;
          return mocks.nativeSupport
            ? { data_collection: [...mocks.granted] }
            : {};
        },
        request: mocks.request,
        remove: mocks.remove,
        onAdded: mocks.onAdded,
        onRemoved: mocks.onRemoved,
      },
      storage: {
        local: {
          get: async (key?: string) =>
            clone(
              key === undefined
                ? mocks.stored
                : key in mocks.stored
                  ? { [key]: mocks.stored[key] }
                  : {}
            ),
          set: (values: Record<string, unknown>) => mocks.set(values),
          remove: async (key: string) => {
            const oldValue = mocks.stored[key];
            delete mocks.stored[key];
            mocks.onChanged.emit({ [key]: { oldValue } }, 'local');
          },
        },
        managed: {
          get: async () => {
            if (!Object.keys(mocks.managed).length) {
              throw new Error('Managed storage manifest not found');
            }
            return clone(mocks.managed);
          },
        },
        onChanged: mocks.onChanged,
      },
      runtime: {
        id: 'test-extension',
        getURL: () => 'moz-extension://test/',
        getManifest: () => ({ version: '1.30.0' }),
        sendMessage: mocks.sendMessage,
      },
    },
  };
});

const fetchMock = vi.fn<typeof fetch>();
let service: ReportingService;

beforeEach(async () => {
  mocks.granted = [];
  mocks.nativeSupport = true;
  mocks.getAll.pending = undefined;
  mocks.stored = {};
  mocks.managed = {};
  mocks.request.mockReset().mockImplementation(async () => {
    mocks.granted = ['technicalAndInteraction'];
    mocks.onAdded.emit({ data_collection: ['technicalAndInteraction'] });
    return true;
  });
  mocks.remove.mockReset().mockImplementation(async () => {
    mocks.granted = [];
    mocks.onRemoved.emit({ data_collection: ['technicalAndInteraction'] });
    return true;
  });
  fetchMock.mockReset().mockResolvedValue(new Response(null, { status: 202 }));
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('crypto', {
    getRandomValues: webcrypto.getRandomValues.bind(webcrypto),
    subtle: webcrypto.subtle,
  });

  const { ReportingService } = await import('../background/reporting');
  service = new ReportingService();
  // Chrome serializes runtime messages as JSON.
  const json = (value: unknown) =>
    value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  mocks.sendMessage.mockReset().mockImplementation(async (message) => {
    const request = json(message);
    switch (request.type) {
      case 'readReportingState':
        return json(await service.readState());
      case 'readReport':
        return json(await service.queue.readReport(request.id));
      case 'deleteReport':
        return service.queue.deleteReport(request.id);
      case 'deleteAllReports':
        return service.queue.deleteAll();
      case 'sendReportsOnce':
        return json(
          await service.sendOnce(request.selectedIds, request.expectedRevision)
        );
      case 'retryReportBatch':
        return json(await service.retryBatch(request.id));
    }
    throw new Error(`Unexpected message ${request.type}`);
  });
});

afterEach(() => {
  unmount();
  service.consent.dispose();
  service.policy.dispose();
  vi.unstubAllGlobals();
});

function Harness() {
  const reporting = useReporting();
  return h(
    Fragment,
    null,
    h(ErrorReportingNotice, reporting),
    h(ErrorReportingSettingsForm, reporting)
  );
}

function mount() {
  const container = document.createElement('div');
  document.body.append(container);
  render(h(Harness, {}), container);
}

function unmount() {
  for (const container of Array.from(document.body.children)) {
    render(null, container);
    container.remove();
  }
}

function report(message: string): PreparedReport {
  return {
    destination: 'bugsnag',
    payload: {
      apiKey: 'test',
      payloadVersion: '5',
      notifier: { name: 'test', version: '1.0.0', url: 'https://example' },
      events: [
        {
          exceptions: [
            {
              errorClass: 'Error',
              message,
              stacktrace: [{ file: 'background.js', method: 'run' }],
            },
          ],
        } as any,
      ],
    },
    context: {
      source: 'background',
      capturedAt: '2026-11-01T00:00:00.000Z',
      appVersion: '1.30.0',
    },
  };
}

async function save(...messages: Array<string>) {
  await service.ready;
  for (const message of messages) {
    expect(await service.capture(report(message))).toEqual({
      status: 'stored',
    });
  }
}

const text = () => document.body.textContent ?? '';

function button(label: string): HTMLButtonElement {
  const match = [...document.querySelectorAll('button')].find(
    (element) => element.textContent?.trim() === label
  );
  if (!match) {
    throw new Error(`No button labelled ${label} in: ${text()}`);
  }
  return match;
}

const checkbox = () =>
  document.getElementById('automaticErrorReporting') as HTMLInputElement;

const sentMessages = () =>
  fetchMock.mock.calls.map(
    ([, init]) =>
      JSON.parse(init!.body as string).events[0].exceptions[0].message
  );

it('stays unchecked and disabled until the reporting setting is known', async () => {
  let resolve!: () => void;
  mocks.getAll.pending = new Promise((r) => (resolve = r));
  await service.policy.ready;
  mount();

  await vi.waitFor(() =>
    expect(text()).toContain('options_error_reporting_checking')
  );
  expect(checkbox().checked).toBe(false);
  expect(checkbox().disabled).toBe(true);

  resolve();
  await vi.waitFor(() => expect(checkbox().disabled).toBe(false));
  expect(checkbox().checked).toBe(false);
  expect(text()).not.toContain('options_error_reporting_checking');
});

it('sends saved reports once, keeps consent off, and retries only the failure', async () => {
  await save('first', 'second', 'third');
  mount();
  await vi.waitFor(() =>
    expect(text()).toContain('options_report_notice_body_other(3)')
  );

  fetchMock.mockImplementation(async (_url, init) =>
    (init!.body as string).includes('second')
      ? new Response(null, { status: 500 })
      : new Response(null, { status: 202 })
  );
  button('options_send_reports_other(3)').click();
  await vi.waitFor(() =>
    expect(text()).toContain('options_send_result_partial(2|3)')
  );
  expect(text()).toContain('options_send_result_partial_remaining_one(1)');
  expect(sentMessages().sort((a, b) => a.localeCompare(b))).toEqual([
    'first',
    'second',
    'third',
  ]);
  expect(mocks.request).not.toHaveBeenCalled();
  expect(mocks.stored.automaticErrorReporting).toBeUndefined();
  expect(document.activeElement?.getAttribute('data-reporting-focus')).toBe(
    'notice-status'
  );

  // A later arrival is outside the batch and its retry.
  await save('later');
  fetchMock.mockResolvedValue(new Response(null, { status: 202 }));
  button('options_error_reporting_try_again').click();
  await vi.waitFor(() =>
    expect(text()).toContain('options_send_result_all_one(1)')
  );
  expect(sentMessages().slice(3)).toEqual(['second']);
  expect(text()).toContain('options_send_result_still_off_notice');
  expect(checkbox().checked).toBe(false);

  button('options_send_result_close').click();
  await vi.waitFor(() =>
    expect(text()).toContain('options_report_notice_body_one(1)')
  );
});

it('still sends the batch once when Firefox declines the permission', async () => {
  await save('first');
  mocks.request.mockResolvedValue(false);
  mount();
  await vi.waitFor(() =>
    expect(text()).toContain('options_report_notice_heading')
  );

  button('options_send_reports_and_enable').click();
  expect(mocks.request).toHaveBeenCalledOnce();
  await vi.waitFor(() =>
    expect(text()).toContain('options_send_result_all_one(1)')
  );
  expect(text()).toContain('options_send_result_declined');
  expect(sentMessages()).toEqual(['first']);
  expect(checkbox().checked).toBe(false);
});

it('turns on automatic reporting from the notice and keeps showing the result', async () => {
  await save('first');
  mount();
  await vi.waitFor(() =>
    expect(text()).toContain('options_report_notice_heading')
  );

  button('options_send_reports_and_enable').click();
  await vi.waitFor(() =>
    expect(text()).toContain('options_send_result_enabled')
  );
  expect(text()).toContain('options_send_result_all_one(1)');
  expect(checkbox().checked).toBe(true);
  expect(mocks.granted).toEqual(['technicalAndInteraction']);

  // The notice condition no longer holds once closed.
  button('options_send_result_close').click();
  await vi.waitFor(() =>
    expect(text()).not.toContain('options_report_notice_heading')
  );
});

it('never flushes the backlog when enabling with the checkbox', async () => {
  await save('first', 'second');
  mount();
  await vi.waitFor(() => expect(checkbox().disabled).toBe(false));

  checkbox().click();
  expect(mocks.request).toHaveBeenCalledOnce();
  await vi.waitFor(() => expect(checkbox().checked).toBe(true));
  expect(text()).toContain('options_error_reporting_enabled_saved_other(2)');
  expect(text()).not.toContain('options_report_notice_heading');
  expect(text()).toContain('options_saved_reports_count_other(2)');
  expect(fetchMock).not.toHaveBeenCalled();

  // Turning it off removes the native permission without deleting reports.
  checkbox().click();
  await vi.waitFor(() => expect(checkbox().checked).toBe(false));
  expect(mocks.remove).toHaveBeenCalledOnce();
  expect(text()).toContain('options_saved_reports_count_other(2)');
});

it('reports a declined permission from the checkbox and external revocation', async () => {
  mocks.request.mockResolvedValue(false);
  mount();
  await vi.waitFor(() => expect(checkbox().disabled).toBe(false));

  checkbox().click();
  await vi.waitFor(() =>
    expect(text()).toContain('options_error_reporting_permission_declined')
  );
  expect(checkbox().checked).toBe(false);

  // e.g. granted from about:addons, then revoked again.
  mocks.granted = ['technicalAndInteraction'];
  mocks.onAdded.emit({ data_collection: ['technicalAndInteraction'] });
  await vi.waitFor(() => expect(checkbox().checked).toBe(true));
  mocks.granted = [];
  mocks.onRemoved.emit({ data_collection: ['technicalAndInteraction'] });
  await vi.waitFor(() => expect(checkbox().checked).toBe(false));
});

it('uses the local preference where there is no native permission', async () => {
  mocks.nativeSupport = false;
  await save('first');
  mount();
  await vi.waitFor(() => expect(checkbox().disabled).toBe(false));

  checkbox().click();
  await vi.waitFor(() => expect(checkbox().checked).toBe(true));
  expect(mocks.request).not.toHaveBeenCalled();
  expect(mocks.stored.automaticErrorReporting).toBe(true);
  expect(fetchMock).not.toHaveBeenCalled();
});

it('dismisses the notice permanently without changing consent or reports', async () => {
  await save('first');
  mount();
  await vi.waitFor(() =>
    expect(text()).toContain('options_report_notice_heading')
  );

  button('options_report_notice_dismiss').click();
  await vi.waitFor(() =>
    expect(text()).toContain('options_report_notice_dismissed')
  );
  expect(mocks.stored.errorReportNoticeDismissed).toBe(true);
  expect(text()).not.toContain('options_report_notice_heading');

  button('options_report_notice_undo').click();
  await vi.waitFor(() =>
    expect(text()).toContain('options_report_notice_heading')
  );
  expect(mocks.stored.errorReportNoticeDismissed).toBeUndefined();

  button('options_report_notice_dismiss').click();
  await vi.waitFor(() =>
    expect(text()).toContain('options_report_notice_dismissed')
  );
  button('options_report_notice_ok').click();
  await vi.waitFor(() =>
    expect(text()).not.toContain('options_report_notice_dismissed')
  );
  unmount();

  mount();
  await vi.waitFor(() =>
    expect(text()).toContain('options_saved_reports_count_one(1)')
  );
  expect(text()).not.toContain('options_report_notice_heading');
  expect(checkbox().checked).toBe(false);
  expect(fetchMock).not.toHaveBeenCalled();
});

it('shows the exact saved payload in the notice and deletes reports individually and all at once', async () => {
  await save('first', 'second', 'third');
  mount();
  await vi.waitFor(() =>
    expect(text()).toContain('options_report_notice_heading')
  );

  // The notice opens its own viewer since about:addons doesn't let us
  // scroll to the one at the bottom of the page.
  button('options_report_notice_view').click();
  const noticeViewer = () =>
    document.getElementById('notice-saved-reports-viewer');
  await vi.waitFor(() =>
    expect(noticeViewer()?.textContent).toContain('Error: first')
  );
  expect(document.getElementById('settings-saved-reports-viewer')).toBeNull();
  expect(
    document
      .querySelector('[data-reporting-focus="notice-viewer"]')
      ?.getAttribute('aria-expanded')
  ).toBe('true');

  const rows = () => [...noticeViewer()!.querySelectorAll('li')];
  rows()[0].querySelector<HTMLButtonElement>('button[aria-expanded]')!.click();
  await vi.waitFor(() => expect(document.querySelector('pre')).not.toBeNull());
  const pre = document.querySelector('pre')!;
  const saved = await service.queue.readReport(
    (await service.queue.readState()).records[0].id
  );
  expect(JSON.parse(pre.textContent!)).toEqual(saved!.payload);
  expect(text()).toContain('options_saved_report_destination_bugsnag');
  expect(text()).toContain('options_saved_report_delivery_heading');
  // Report content stays out of click breadcrumbs.
  expect(pre.closest('[data-report-content]')).not.toBeNull();

  const deletedTitle = rows()[0].querySelector('.font-medium')!.textContent!;
  expect(deletedTitle).toMatch(/^Error: (first|second|third)$/);
  rows()[0]
    .querySelector<HTMLButtonElement>(
      'button[aria-label^="options_saved_report_delete_label"]'
    )!
    .click();
  await vi.waitFor(() =>
    expect(text()).toContain('options_saved_reports_count_other(2)')
  );
  expect(text()).not.toContain(deletedTitle);
  expect(text()).toContain('options_report_notice_body_other(2)');
  expect(document.activeElement?.getAttribute('data-reporting-focus')).toBe(
    'notice-viewer'
  );

  // The settings section has its own viewer, including the send actions.
  document
    .querySelector<HTMLButtonElement>(
      '[aria-controls="settings-saved-reports-viewer"]'
    )!
    .click();
  await vi.waitFor(() =>
    expect(
      document.getElementById('settings-saved-reports-viewer')?.textContent
    ).toContain('options_send_reports_other(2)')
  );
  expect(
    document
      .getElementById('settings-saved-reports-viewer')
      ?.hasAttribute('data-report-content')
  ).toBe(true);

  button('options_saved_reports_delete_all').click();
  await vi.waitFor(() =>
    expect(document.activeElement?.textContent).toBe(
      'options_saved_reports_cancel'
    )
  );
  expect(text()).toContain('options_saved_reports_delete_all_confirm_other(2)');
  button('options_saved_reports_delete_all_confirm_button').click();
  await vi.waitFor(() =>
    expect(text()).toContain('options_saved_reports_deleted')
  );
  expect(text()).toContain('options_saved_reports_none');
  expect(text()).not.toContain('options_report_notice_heading');
  expect(text()).not.toContain('options_send_reports');
  expect(text()).not.toContain('options_saved_reports_delete_all');
  expect(fetchMock).not.toHaveBeenCalled();
});

it('blocks both send actions when the organization disables sending', async () => {
  mocks.managed = { DisableErrorReporting: true };
  mocks.granted = ['technicalAndInteraction'];
  await save('first');
  mount();
  await vi.waitFor(() =>
    expect(text()).toContain('options_error_reporting_disabled_by_organization')
  );
  expect(checkbox().disabled).toBe(true);
  expect(checkbox().checked).toBe(false);
  expect(text()).not.toContain('options_report_notice_heading');
  expect(text()).toContain('options_saved_reports_description_blocked');

  // Inspection and deletion remain available.
  document
    .querySelector<HTMLButtonElement>(
      '[aria-controls="settings-saved-reports-viewer"]'
    )!
    .click();
  await vi.waitFor(() => expect(text()).toContain('Error: first'));
  expect(text()).not.toContain('options_send_reports');
  expect(text()).toContain('options_saved_reports_delete_all');
});

it('hides saved reports when the organization disables local storage', async () => {
  await save('first');
  mount();
  await vi.waitFor(() =>
    expect(text()).toContain('options_report_notice_heading')
  );

  mocks.managed = { DisableLocalErrorStorage: true };
  mocks.onChanged.emit({}, 'managed');
  await vi.waitFor(() =>
    expect(text()).toContain('options_saved_reports_storage_disabled')
  );
  expect(text()).not.toContain('options_report_notice_heading');
  expect(text()).not.toContain('options_saved_reports_count');
  // Automatic sending is independently permitted.
  expect(checkbox().disabled).toBe(false);
  expect(
    (mocks.stored.diagnosticReports as { records: Array<unknown> }).records
  ).toEqual([]);
});

it('says local storage is disabled even when automatic reporting is on', async () => {
  mocks.granted = ['technicalAndInteraction'];
  mocks.managed = { DisableLocalErrorStorage: true };
  mount();

  await vi.waitFor(() =>
    expect(text()).toContain('options_saved_reports_storage_disabled')
  );
  expect(checkbox().checked).toBe(true);
  expect(checkbox().disabled).toBe(false);
});

it('follows a batch another page started rather than reporting it complete', async () => {
  await save('first', 'second');
  mount();
  await vi.waitFor(() =>
    expect(text()).toContain('options_report_notice_body_other(2)')
  );

  let open!: () => void;
  const gate = new Promise<void>((resolve) => (open = resolve));
  fetchMock.mockImplementation(async () => {
    await gate;
    return new Response(null, { status: 202 });
  });

  // Another options page starts sending just before this one.
  const { records, revision } = await service.queue.readState();
  const other = service.sendOnce(
    records.map((record) => record.id),
    revision
  );
  button('options_send_reports_other(2)').click();

  // Background replies with the running batch. It isn't finished yet.
  await vi.waitFor(() =>
    expect(
      mocks.sendMessage.mock.calls.some(
        ([message]) => (message as { type: string }).type === 'sendReportsOnce'
      )
    ).toBe(true)
  );
  await new Promise((resolve) => setTimeout(resolve, 100));
  expect(text()).toContain('options_sending_reports_other(2)');
  expect(text()).not.toContain('options_send_result');

  open();
  await other;
  await vi.waitFor(
    () => expect(text()).toContain('options_send_result_all_other(2)'),
    { timeout: 3000 }
  );
});

it('offers to retry reading a report that could not be read', async () => {
  await save('first');
  const dispatch = mocks.sendMessage.getMockImplementation()!;
  let failReads = true;
  mocks.sendMessage.mockImplementation(async (message) => {
    if ((message as { type: string }).type === 'readReport' && failReads) {
      throw new Error('Background unavailable');
    }
    return dispatch(message);
  });
  mount();
  await vi.waitFor(() =>
    expect(text()).toContain('options_report_notice_heading')
  );

  button('options_report_notice_view').click();
  const row = () => document.querySelector('#notice-saved-reports-viewer li');
  await vi.waitFor(() => expect(row()).not.toBeNull());
  row()!.querySelector<HTMLButtonElement>('button[aria-expanded]')!.click();
  await vi.waitFor(() =>
    expect(text()).toContain('options_saved_report_data_load_failed')
  );
  expect(row()!.querySelector('progress')).toBeNull();

  failReads = false;
  button('options_error_reporting_try_again').click();
  await vi.waitFor(() => expect(row()!.querySelector('pre')).not.toBeNull());
  expect(text()).not.toContain('options_saved_report_data_load_failed');
});

it('follows a retry another page starts after this page shows a result', async () => {
  await save('first');
  mount();
  await vi.waitFor(() =>
    expect(text()).toContain('options_report_notice_heading')
  );

  fetchMock.mockResolvedValue(new Response(null, { status: 500 }));
  button('options_send_reports_one(1)').click();
  await vi.waitFor(() =>
    expect(text()).toContain('options_send_result_failed_one(1)')
  );

  let open!: () => void;
  const gate = new Promise<void>((resolve) => (open = resolve));
  fetchMock.mockImplementation(async () => {
    await gate;
    return new Response(null, { status: 202 });
  });

  // Another options page retries the batch this page reported.
  const batchId = (await service.readState()).batch!.id;
  const retry = service.retryBatch(batchId);
  await vi.waitFor(() =>
    expect(text()).toContain('options_sending_reports_one(1)')
  );
  expect(text()).not.toContain('options_error_reporting_try_again');

  open();
  await retry;
  await vi.waitFor(
    () => expect(text()).toContain('options_send_result_all_one(1)'),
    { timeout: 3000 }
  );
});
