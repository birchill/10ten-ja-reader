import browser from 'webextension-polyfill';

import type { BackgroundRequest } from '../../background/background-request';
import type { TtsFetchResult } from '../../background/tts-fetch';
import type { TtsClipRequest } from '../../common/tts/tts-request';
import { rejectWhenAborted } from '../../utils/reject-when-aborted';

import type { FetchClip } from './tts-player';

export const fetchTtsClip: FetchClip = async (request, signal) => {
  const requestId = nextRequestId();

  const response = await rejectWhenAborted(
    sendFetch(request, requestId),
    signal,
    () => void sendCancel(requestId)
  );

  if (!response?.ok) {
    throw new Error('Clip fetch failed');
  }

  return {
    bytes: decodeBase64(response.audioBase64),
    moraTiming: response.moraTiming,
  };
};

const instancePrefix = Math.random().toString(36).slice(2);
let requestCounter = 0;

function nextRequestId(): string {
  requestCounter += 1;
  return `${instancePrefix}-${requestCounter}`;
}

function sendFetch(
  request: TtsClipRequest,
  requestId: string
): Promise<TtsFetchResult | undefined> {
  return browser.runtime.sendMessage<
    BackgroundRequest,
    TtsFetchResult | undefined
  >({ type: 'fetchTtsClip', request, requestId });
}

function sendCancel(requestId: string): Promise<void> {
  return browser.runtime
    .sendMessage<BackgroundRequest, void>({ type: 'cancelTtsFetch', requestId })
    .catch(() => {});
}

function decodeBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
