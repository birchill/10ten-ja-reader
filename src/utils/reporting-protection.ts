import type { DeliveryPayload, Plugin } from '@birchill/bugsnag-zero';
import { interactionBreadcrumbs } from '@birchill/bugsnag-zero';

import type {
  SearchOtherRequest,
  SearchRequest,
} from '../background/background-request';

export function lookupBreadcrumb(request: SearchRequest | SearchOtherRequest) {
  return {
    input: 'x'.repeat(request.input.length),
    ...('noSplitMask' in request ? { noSplitMask: request.noSplitMask } : {}),
    ...('wordsMatchLen' in request
      ? { wordsMatchLen: request.wordsMatchLen }
      : {}),
  };
}

export function protectDiagnosticText(text: string): string {
  return text
    .replace(
      /Search string should be a single character:[\s\S]*/,
      'Search string should be a single character: [hidden]'
    )
    .replace(
      /https:\/\/data\.10ten\.life\/audio\/[^\s"'<>]*/g,
      'https://data.10ten.life/audio/[hidden]'
    );
}

// Only call on the SDK's detached JSON snapshot, before saving or sending.
// This also covers copies of the known message in causes and metadata, without
// changing the original Error or introducing broad error-message filtering.
export function protectPreparedReport(payload: DeliveryPayload): void {
  function visit(value: Record<string, unknown> | Array<unknown>) {
    for (const [key, child] of Object.entries(value)) {
      if (typeof child === 'string') {
        (value as Record<string, unknown>)[key] = protectDiagnosticText(child);
      } else if (child && typeof child === 'object') {
        visit(child as Record<string, unknown>);
      }
    }
  }
  visit(payload);
}

// Mark elements that display saved report content or act on it. Clicks inside
// them leave no breadcrumb, so a report's content cannot be copied into later
// reports through the SDK's click text or selector.
export const REPORT_CONTENT_ATTRIBUTE = 'data-report-content';

export const reportingInteractionBreadcrumbs: Plugin = {
  name: 'reportingInteractionBreadcrumbs',
  load(client) {
    if (!('addEventListener' in self)) {
      return;
    }

    // Bugsnag Zero's interactionBreadcrumbs plugin, loaded below, records
    // clicks synchronously from its own capturing listener. Register ours
    // first so we classify each click before it runs.
    let clickTarget: 'inside' | 'ancestor' | undefined;
    self.addEventListener(
      'click',
      (event) => {
        const target = event.target as Partial<Element> | null;
        clickTarget = undefined;
        if (typeof target?.closest !== 'function') {
          return;
        }

        const selector = `[${REPORT_CONTENT_ATTRIBUTE}]`;
        if (target.closest(selector)) {
          clickTarget = 'inside';
        } else if (target.querySelector?.(selector)) {
          clickTarget = 'ancestor';
        }
      },
      true
    );

    const filtered = Object.create(client) as typeof client;
    filtered.leaveBreadcrumb = (message, metadata, type) => {
      if (type === 'user' && message === 'UI click' && clickTarget) {
        if (clickTarget === 'inside') {
          return;
        }

        // Keep ordinary clicks on page containers, but not their text, which
        // includes any report shown inside them.
        metadata = { ...metadata, targetText: '[hidden]' };
      }

      client.leaveBreadcrumb(message, metadata, type);
    };

    return interactionBreadcrumbs.load(filtered);
  },
};
