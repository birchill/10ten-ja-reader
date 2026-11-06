import type { DeliveryPayload, NotifyResult } from '@birchill/bugsnag-zero';
import * as s from 'superstruct';
import browser from 'webextension-polyfill';

const BugsnagPayloadSchema: s.Struct<DeliveryPayload> = s.type({
  apiKey: s.string(),
  payloadVersion: s.string(),
  notifier: s.type({ name: s.string(), version: s.string(), url: s.string() }),
  events: s.size(
    s.array(
      s.type({
        exceptions: s.array(
          s.type({
            errorClass: s.string(),
            stacktrace: s.array(
              s.type({ file: s.string(), method: s.string() })
            ),
          })
        ),
      })
    ),
    1,
    1
  ),
});
const ContextSchema = s.type({
  source: s.enums(['background', 'options']),
  capturedAt: s.string(),
  appVersion: s.string(),
});
export const PreparedReportSchema = s.union([
  s.type({
    destination: s.literal('bugsnag'),
    payload: BugsnagPayloadSchema,
    context: ContextSchema,
  }),
  s.type({
    destination: s.literal('download-failure'),
    payload: s.type({
      t: s.literal('dl_failed'),
      etype: s.enums(['timeout', 'network', 'syntax']),
      url: s.string(),
      v: s.string(),
      uid: s.optional(s.string()),
      msg: s.optional(s.string()),
    }),
    context: ContextSchema,
  }),
]);
export type PreparedReport = s.Infer<typeof PreparedReportSchema>;

// Chrome runtime messaging uses JSON, so serialize Error explicitly in replies.
export function captureReply(result: NotifyResult) {
  return result.status === 'failed'
    ? {
        status: 'failed' as const,
        message: result.error.message,
        statusCode: result.statusCode,
      }
    : result;
}

export async function forwardPreparedReport(
  report: PreparedReport
): Promise<NotifyResult> {
  try {
    const result = (await browser.runtime.sendMessage({
      type: 'capturePreparedReport',
      report,
    })) as ReturnType<typeof captureReply> | undefined;
    if (!result) {
      return {
        status: 'failed',
        error: new Error('No reporting service response'),
      };
    }

    return result.status === 'failed'
      ? {
          status: 'failed',
          error: new Error(result.message),
          statusCode: result.statusCode,
        }
      : result;
  } catch (error) {
    return {
      status: 'failed',
      error:
        error instanceof Error
          ? error
          : new Error('Reporting service unavailable'),
    };
  }
}
