// @vitest-environment jsdom
import { BugsnagStatic } from '@birchill/bugsnag-zero';
import { expect, it } from 'vitest';

import {
  lookupBreadcrumb,
  protectPreparedReport,
  reportingInteractionBreadcrumbs,
} from './reporting-protection';

it('selects lookup fields rather than carrying extra request content', () => {
  const request = {
    input: 'LOOKUP_SECRET',
    noSplitMask: 2,
    wordsMatchLen: 3,
    extra: 'EXTRA_SECRET',
  };
  expect(lookupBreadcrumb(request)).toEqual({
    input: 'xxxxxxxxxxxxx',
    noSplitMask: 2,
    wordsMatchLen: 3,
  });
});

it('removes known input copies and audio paths while preserving other diagnostics', async () => {
  const client = new BugsnagStatic();
  const preserved = {
    languages: ['ja', 'fr', 'en-US'],
    userAgent: 'Full UA',
    excerpt: '<html>Captive portal</html>',
  };
  client.setDelivery({
    async sendEvent(payload) {
      protectPreparedReport(payload);
      expect(JSON.stringify(payload)).not.toContain('LOOKUP_SECRET');
      expect(JSON.stringify(payload)).not.toContain('AUDIO_SECRET');
      const event = payload.events[0];
      expect(event.exceptions[0].message).toBe(
        'Unfamiliar error worth keeping'
      );
      expect(event.exceptions[1].message).toBe(
        'Search string should be a single character: [hidden]'
      );
      expect(event.metaData?.preserved).toEqual(preserved);
      return { status: 'sent' };
    },
  });
  client.start({ apiKey: 'test', plugins: [] });
  client.leaveBreadcrumb('fetch() succeeded', {
    request: 'GET https://data.10ten.life/audio/AUDIO_SECRET.mp3',
  });
  const cause = new Error(
    'Search string should be a single character: LOOKUP_SECRET'
  );
  const result = await client.notify(
    new Error('Unfamiliar error worth keeping', { cause }),
    { metadata: { preserved, copiedMessage: cause.message } }
  );
  expect(result.status).toBe('sent');
  expect(cause.message).toContain('LOOKUP_SECRET');
});

it('omits saved report content from click breadcrumbs', async () => {
  document.body.innerHTML = `
    <main id="page">
      <button id="ordinary" type="button">Check for updates</button>
      <section id="viewer" data-report-content>
        <button id="row" type="button">TypeError: REPORT_SECRET</button>
        <pre>{"message":"REPORT_SECRET"}</pre>
        <button id="send" type="button">Send 1 report</button>
      </section>
    </main>`;
  const client = new BugsnagStatic();
  let breadcrumbs: Array<{ name: string; metaData?: unknown }> = [];
  client.setDelivery({
    async sendEvent(payload) {
      breadcrumbs = payload.events[0].breadcrumbs ?? [];
      return { status: 'sent' };
    },
  });
  client.start({ apiKey: 'test', plugins: [reportingInteractionBreadcrumbs] });

  for (const id of ['ordinary', 'row', 'send', 'viewer', 'page']) {
    document.getElementById(id)!.click();
  }
  document.querySelector('pre')!.click();
  await client.notify(new Error('Test'));

  expect(JSON.stringify(breadcrumbs)).not.toContain('REPORT_SECRET');
  const clicks = breadcrumbs
    .filter((breadcrumb) => breadcrumb.name === 'UI click')
    .map((breadcrumb) => breadcrumb.metaData);
  expect(clicks).toEqual([
    { targetText: 'Check for updates', targetSelector: 'BUTTON#ordinary' },
    { targetText: '[hidden]', targetSelector: 'MAIN#page' },
  ]);
  document.body.innerHTML = '';
});
