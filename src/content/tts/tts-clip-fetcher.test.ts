import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { BackgroundRequest } from '../../background/background-request';
import type { TtsFetchResult } from '../../background/tts-fetch';
import type { TtsClipRequest } from '../../common/tts/tts-request';

import { fetchTtsClip } from './tts-clip-fetcher';

const { sendMessage } = vi.hoisted(() => ({
  sendMessage: vi.fn<(message: BackgroundRequest) => Promise<unknown>>(),
}));

vi.mock('webextension-polyfill', () => ({
  default: { runtime: { sendMessage } },
}));

const request: TtsClipRequest = { kanji: '猫', reading: 'ねこ' };

beforeEach(() => {
  sendMessage.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchTtsClip', () => {
  it('decodes the base64 audio into bytes and passes the mora timing through', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const moraTiming = { charTimingsMs: [0, 100], totalDurationMs: 200 };
    sendMessage.mockResolvedValue({
      ok: true,
      audio: Buffer.from(bytes).toString('base64'),
      moraTiming,
    } satisfies TtsFetchResult);

    const clip = await fetchTtsClip(request, new AbortController().signal);

    expect(clip).toEqual({ bytes, moraTiming });
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'fetchTtsClip', request })
    );
  });

  it('rejects when the background reports a failed fetch', async () => {
    sendMessage.mockResolvedValue({ ok: false } satisfies TtsFetchResult);

    await expect(
      fetchTtsClip(request, new AbortController().signal)
    ).rejects.toThrow('Clip fetch failed');
  });

  it('rejects cleanly when the background sends no response at all', async () => {
    sendMessage.mockResolvedValue(undefined);

    await expect(
      fetchTtsClip(request, new AbortController().signal)
    ).rejects.toThrow('Clip fetch failed');
  });

  it('sends a cancel even when the signal is already aborted before the call', async () => {
    sendMessage.mockResolvedValue(undefined);
    const controller = new AbortController();
    controller.abort();

    await expect(fetchTtsClip(request, controller.signal)).rejects.toThrow(
      'Aborted'
    );

    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'cancelTtsFetch' })
    );
  });

  it('sends a cancel and rejects promptly when the signal aborts mid-flight', async () => {
    sendMessage.mockImplementation((message) =>
      message.type === 'fetchTtsClip'
        ? new Promise(() => {})
        : Promise.resolve()
    );
    const controller = new AbortController();

    const pending = fetchTtsClip(request, controller.signal);
    controller.abort();

    await expect(pending).rejects.toThrow('Aborted');
    const [fetchCall, cancelCall] = sendMessage.mock.calls as Array<
      [BackgroundRequest]
    >;
    expect(cancelCall[0]).toEqual({
      type: 'cancelTtsFetch',
      requestId: (fetchCall[0] as { requestId: string }).requestId,
    });
  });

  it('removes its abort listener once the fetch settles', async () => {
    sendMessage.mockResolvedValue({
      ok: true,
      audio: '',
    } satisfies TtsFetchResult);
    const controller = new AbortController();
    const added = vi.spyOn(controller.signal, 'addEventListener');
    const removed = vi.spyOn(controller.signal, 'removeEventListener');

    await fetchTtsClip(request, controller.signal);

    expect(added).toHaveBeenCalledWith('abort', expect.any(Function), {
      once: true,
    });
    expect(removed).toHaveBeenCalledWith(
      'abort',
      added.mock.calls[0]![1] as EventListener
    );
  });
});
