// sort-imports-ignore

vi.mock('./query', () => ({ query: vi.fn<typeof query>() }));

import { act } from 'preact/test-utils';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import type { ContentConfigParams } from '../common/content-config-params';

import type { ContentHandler as ContentHandlerType } from './content';
import { query, type QueryResult } from './query';
import { TtsPlaybackController } from './tts-playback-controller';

describe('Playback shortcut routing', () => {
  let ContentHandler: typeof ContentHandlerType;
  let handler: ContentHandlerType;
  const sendMessage = vi
    .fn<(message: unknown) => Promise<unknown>>()
    .mockResolvedValue(undefined);

  beforeAll(async () => {
    vi.stubGlobal('__VERSION__', 'test');
    vi.stubGlobal('chrome', { runtime: { id: 'test' } });
    vi.stubGlobal('browser', {
      runtime: {
        id: 'test',
        getURL: (path: string) => path,
        sendMessage,
        onMessage: {
          addListener: vi.fn<(listener: unknown) => void>(),
          removeListener: vi.fn<(listener: unknown) => void>(),
        },
      },
      i18n: { getMessage: (key: string) => (key === 'lang_tag' ? 'en' : key) },
    });
    ({ ContentHandler } = await import('./content'));
  });

  beforeEach(async () => {
    sendMessage.mockReset().mockResolvedValue(undefined);
    vi.spyOn(ContentHandler.prototype, 'isTopMostWindow').mockReturnValue(
      false
    );
    handler = new ContentHandler(makeConfig());
    await notifyPopupShown(handler);
    sendMessage.mockClear();
  });

  afterEach(() => {
    handler.detach();
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  afterAll(() => {
    window.removeReaderScript?.();
    delete window.removeReaderScript;
    delete window.readerScriptVer;
    vi.unstubAllGlobals();
  });

  it('forwards playback once for a held key with reading audio disabled', () => {
    const event = pressKey();
    const repeated = pressKey({ repeat: true });

    expect(event.defaultPrevented).toBe(true);
    expect(repeated.defaultPrevented).toBe(true);
    expect(sendMessage).toHaveBeenCalledExactlyOnceWith({
      type: 'top:togglePlayback',
    });
  });

  it('leaves Ctrl+P alone', () => {
    const event = pressKey({ ctrlKey: true });

    expect(event.defaultPrevented).toBe(false);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('respects a disabled playback shortcut', () => {
    const config = makeConfig();
    config.keys.playReadings = [];
    handler.setConfig(config);

    const event = pressKey();

    expect(event.defaultPrevented).toBe(false);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('uses the existing configured shortcut case-insensitively', () => {
    const config = makeConfig();
    config.keys.playReadings = ['a'];
    handler.setConfig(config);

    expect(pressKey().defaultPrevented).toBe(false);
    expect(pressKey({ key: 'A' }).defaultPrevented).toBe(true);
    expect(sendMessage).toHaveBeenCalledExactlyOnceWith({
      type: 'top:togglePlayback',
    });
  });

  it('ignores playback when the current entry has nothing to play', async () => {
    await notifyPopupShown(handler, false);

    const event = pressKey();

    expect(event.defaultPrevented).toBe(false);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('stops forwarding after the popup closes', async () => {
    await handler.onBackgroundMessage({
      type: 'popupHidden',
      frame: 'children',
    });

    const event = pressKey();

    expect(event.defaultPrevented).toBe(false);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('prevents playback in copy mode and restores it on exit', () => {
    handler.enterCopyMode({ trigger: 'keyboard' });
    sendMessage.mockClear();

    expect(pressKey().defaultPrevented).toBe(false);

    expect(sendMessage).not.toHaveBeenCalled();

    handler.exitCopyMode();
    sendMessage.mockClear();

    expect(pressKey().defaultPrevented).toBe(true);
    expect(sendMessage).toHaveBeenCalledExactlyOnceWith({
      type: 'top:togglePlayback',
    });
  });

  it('toggles the first kanji in a static popup with reading audio disabled', async () => {
    await lookupKanji();
    const root = document.getElementById('tenten-ja-window')!.shadowRoot!;

    expect(root.querySelector('.entry-data')?.textContent).toContain('士');
    expect(root.querySelector('svg path[pathLength]')).toBeNull();
    expect(root.getAnimations()).toHaveLength(0);

    act(() => {
      pressKey();
    });

    expect(root.querySelector('svg path[pathLength]')).not.toBeNull();
    expect(root.getAnimations().length).toBeGreaterThan(0);

    act(() => {
      pressKey();
    });

    expect(root.querySelector('svg path[pathLength]')).toBeNull();
    expect(root.getAnimations()).toHaveLength(0);
  });

  it.each(['words', 'names'] as const)(
    'routes playback to readings after switching to %s',
    async (tab) => {
      const result = makeKanjiResult();
      result.words = {
        type: 'words',
        matchLen: 1,
        more: false,
        data: [
          {
            id: 1,
            k: [],
            r: [{ ent: 'ひ', romaji: 'hi', match: true }],
            s: [{ g: [{ str: 'day' }], pos: ['n'], match: true }],
            matchLen: 1,
          },
        ],
      };
      result.names = {
        type: 'names',
        matchLen: 2,
        more: false,
        data: [
          {
            id: 2,
            k: ['佐藤'],
            r: ['さとう'],
            tr: [{ det: ['Sato'], type: ['surname'] }],
            matchLen: 2,
          },
        ],
      };
      await lookupKanji(result);
      const toggleReadings = vi
        .spyOn(TtsPlaybackController.prototype, 'toggle')
        .mockImplementation(() => {});
      act(() => {
        handler.setConfig({ ...makeConfig(), playReadings: true });
        handler.showDictionary(tab);
        pressKey();
      });

      expect(toggleReadings).toHaveBeenCalledExactlyOnceWith(0);
    }
  );

  it('does not play a later kanji when the first has no stroke data', async () => {
    const result = makeKanjiResult();
    const entry = result.kanji!.data[0];
    result.kanji!.data = [{ ...entry, st: undefined }, entry];
    await lookupKanji(result);
    const root = document.getElementById('tenten-ja-window')!.shadowRoot!;

    expect(pressKey().defaultPrevented).toBe(false);
    expect(root.getAnimations()).toHaveLength(0);
  });

  it('ignores a forwarded toggle after the shortcut is disabled in the top frame', async () => {
    await lookupKanji();
    const config = makeConfig();
    config.keys.playReadings = [];
    handler.setConfig(config);

    await act(async () => {
      await handler.onBackgroundMessage({
        type: 'togglePlayback',
        frame: 'top',
      });
    });

    const root = document.getElementById('tenten-ja-window')!.shadowRoot!;
    expect(root.getAnimations()).toHaveLength(0);
  });

  it('stops the animation on close and ignores a delayed forwarded toggle', async () => {
    await lookupKanji();
    const root = document.getElementById('tenten-ja-window')!.shadowRoot!;
    act(() => {
      pressKey();
    });
    expect(root.getAnimations().length).toBeGreaterThan(0);

    await act(async () => {
      handler.clearResult();
      await handler.onBackgroundMessage({
        type: 'togglePlayback',
        frame: 'top',
      });
    });

    expect(handler.isVisible()).toBe(false);
    expect(root.getAnimations()).toHaveLength(0);
  });

  it('refreshes the visible hint when the configured shortcut changes', async () => {
    await lookupKanji();
    const config = makeConfig();
    config.popupInteractive = true;
    act(() => {
      handler.setConfig(config);
    });
    const root = document.getElementById('tenten-ja-window')!.shadowRoot!;
    expect(root.querySelector('svg title')?.textContent).toBe(
      'content_stroke_animation_play (p)'
    );

    act(() => {
      handler.setConfig({
        ...config,
        keys: { ...config.keys, playReadings: ['a'] },
      });
    });
    expect(root.querySelector('svg title')?.textContent).toBe(
      'content_stroke_animation_play (a)'
    );

    act(() => {
      handler.setConfig({
        ...config,
        keys: { ...config.keys, playReadings: [] },
      });
    });
    expect(root.querySelector('svg title')?.textContent).toBe(
      'content_stroke_animation_play'
    );
    expect(pressKey().defaultPrevented).toBe(false);
  });

  it('preserves typing in an input when a popup appears', async () => {
    const input = document.createElement('input');
    document.body.append(input);
    input.focus();
    await notifyPopupShown(handler);
    sendMessage.mockClear();

    const event = pressKey({}, input);

    expect(event.defaultPrevented).toBe(false);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  async function lookupKanji(result = makeKanjiResult()) {
    vi.spyOn(handler, 'isTopMostWindow').mockReturnValue(true);
    vi.mocked(query).mockResolvedValue(result);
    await handler.lookupText({
      dictMode: 'kanji',
      source: null,
      sourceContext: null,
      text: '士',
      wordLookup: true,
      targetProps: {
        contentType: 'text',
        fromPuck: false,
        fromTouch: false,
        hasTitle: false,
        isVerticalText: false,
      },
    });
    await vi.waitFor(() => expect(handler.isVisible()).toBe(true));
  }
});

function makeConfig(): ContentConfigParams {
  return {
    accentDisplay: 'none',
    autoExpand: [],
    bunproDisplay: false,
    copyHeadwords: 'common',
    copyPos: 'none',
    copySenses: 'first',
    dictLang: 'en',
    enableTapLookup: false,
    fx: undefined,
    fontFace: 'system',
    fontSize: 'normal',
    highlightStyle: 'yellow',
    handedness: 'unset',
    holdToShowKeys: [],
    holdToShowImageKeys: [],
    kanjiReferences: [],
    keys: {
      toggleDefinition: [],
      nextDictionary: [],
      kanjiLookup: [],
      expandPopup: [],
      closePopup: [],
      pinPopup: [],
      movePopupUp: [],
      movePopupDown: [],
      startCopy: ['c'],
      playReadings: ['p'],
    },
    noTextHighlight: true,
    playReadings: false,
    popupInteractive: false,
    popupStyle: 'default',
    posDisplay: 'none',
    preferredUnits: 'metric',
    puckState: undefined,
    readingOnly: false,
    showKanjiComponents: true,
    showPriority: false,
    showPuck: 'hide',
    showRomaji: false,
    tabDisplay: 'top',
    toolbarIcon: 'default',
    waniKaniVocabDisplay: 'hide',
  };
}

async function notifyPopupShown(
  handler: ContentHandlerType,
  playbackAvailable = true
) {
  await handler.onBackgroundMessage({
    type: 'popupShown',
    frame: 'children',
    state: {
      contentType: 'text',
      playbackAvailable,
      display: { mode: 'static' },
    },
  });
}

function pressKey(
  options: KeyboardEventInit = {},
  target: EventTarget = window
) {
  const event = new KeyboardEvent('keydown', {
    key: 'p',
    bubbles: true,
    cancelable: true,
    ...options,
  });
  target.dispatchEvent(event);
  return event;
}

function makeKanjiResult(): QueryResult {
  return {
    words: null,
    resultType: 'full',
    kanji: {
      type: 'kanji',
      matchLen: 1,
      data: [
        {
          c: '士',
          r: { on: ['シ'], kun: ['さむらい'] },
          m: ['samurai'],
          m_lang: 'en',
          rad: {
            x: {
              r: 33,
              c: '⼠',
              na: ['さむらい'],
              m: ['samurai'],
              m_lang: 'en',
            },
          },
          refs: {},
          misc: { sc: 3 },
          st: 'M10 50L90 50M50 10L50 90M20 90L80 90',
          comp: [],
          cf: [],
        },
      ],
    },
  };
}
