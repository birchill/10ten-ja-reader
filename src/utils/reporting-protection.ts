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

export const reportingInteractionBreadcrumbs: Plugin = {
  name: 'reportingInteractionBreadcrumbs',
  load(client) {
    // TODO: Exclude report-viewer contents from click breadcrumbs when
    // the viewer is implemented, including clicks on ancestors containing it.
    return interactionBreadcrumbs.load(client);
  },
};
