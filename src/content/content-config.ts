import { ContentConfigParams } from '../common/content-config-params';
import { getHoverCapabilityMql, getMouseCapabilityMql } from '../utils/device';
import { Entries, Overwrite } from '../utils/type-helpers';

export type ContentConfigChange =
  | Overwrite<
      {
        [K in keyof ContentConfigParams]: {
          key: K;
          value: ContentConfigParams[K];
        };
      },
      { showPuck: { key: 'showPuck'; value: 'hide' | 'show' } }
    >[keyof ContentConfigParams]
  | { key: 'canHover'; value: boolean };

export type ContentConfigListener = (
  changes: readonly ContentConfigChange[]
) => void;

export class ContentConfig implements ContentConfigParams {
  private params: ContentConfigParams;
  private mouseCapabilityMql = getMouseCapabilityMql();
  private hoverCapabilityMql = getHoverCapabilityMql();
  listeners: Array<ContentConfigListener> = [];

  constructor(params: Readonly<ContentConfigParams>) {
    this.set(params);

    this.onMouseCapabilityChange = this.onMouseCapabilityChange.bind(this);
    this.onHoverCapabilityChange = this.onHoverCapabilityChange.bind(this);
  }

  set(params: Readonly<ContentConfigParams>) {
    const before: Partial<ContentConfig> = {};
    if (this.params) {
      for (const key of Object.keys(params)) {
        const contentKey = key as keyof ContentConfig;
        if (typeof this[contentKey] === 'undefined') {
          continue;
        }
        (before[contentKey] satisfies ContentConfig[typeof contentKey]) =
          this[contentKey];
      }
    }

    this.params = { ...params };

    const changes: ContentConfigChange[] = [];
    const objectKeysWeCareAbout = ['autoExpand', 'puckState'];
    for (const [key, value] of Object.entries(
      before
    ) as Entries<ContentConfigParams>) {
      // We don't care about changes to most object-typed settings
      if (typeof value === 'object') {
        if (
          objectKeysWeCareAbout.includes(key) &&
          JSON.stringify(value) !== JSON.stringify(this[key])
        ) {
          changes.push({ key, value: this[key] } as ContentConfigChange);
        }
        continue;
      }

      if (this[key] !== value) {
        changes.push({ key, value: this[key] } as ContentConfigChange);
      }
    }

    if (changes.length) {
      this.notifyListeners(changes);
    }
  }

  addListener(listener: ContentConfigListener) {
    const hadListeners = this.listeners.length !== 0;

    if (!this.listeners.includes(listener)) {
      this.listeners.push(listener);
    }

    if (!hadListeners) {
      this.mouseCapabilityMql?.addEventListener(
        'change',
        this.onMouseCapabilityChange
      );
      this.hoverCapabilityMql?.addEventListener(
        'change',
        this.onHoverCapabilityChange
      );
    }
  }

  removeListener(listener: ContentConfigListener) {
    const hadListeners = this.listeners.length !== 0;

    this.listeners = this.listeners.filter((l) => l !== listener);

    if (hadListeners && this.listeners.length === 0) {
      this.mouseCapabilityMql?.removeEventListener(
        'change',
        this.onMouseCapabilityChange
      );
      this.hoverCapabilityMql?.removeEventListener(
        'change',
        this.onHoverCapabilityChange
      );
    }
  }

  private notifyListeners(changes: readonly ContentConfigChange[]) {
    const listenersCopy = this.listeners.slice();
    for (const listener of listenersCopy) {
      listener(changes);
    }
  }

  get accentDisplay() {
    return this.params.accentDisplay;
  }
  get autoExpand() {
    return this.params.autoExpand;
  }
  get copyHeadwords() {
    return this.params.copyHeadwords;
  }
  get copyPos() {
    return this.params.copyPos;
  }
  get copySenses() {
    return this.params.copySenses;
  }
  get bunproDisplay() {
    return this.params.bunproDisplay;
  }
  get dictLang() {
    return this.params.dictLang;
  }
  get enableTapLookup() {
    return this.params.enableTapLookup;
  }
  get fx() {
    return this.params.fx;
  }
  get fontFace() {
    return this.params.fontFace;
  }
  get fontSize() {
    return this.params.fontSize;
  }
  get highlightStyle() {
    return this.params.highlightStyle;
  }
  get holdToShowKeys() {
    return this.params.holdToShowKeys;
  }
  get holdToShowImageKeys() {
    return this.params.holdToShowImageKeys;
  }
  get kanjiReferences() {
    return this.params.kanjiReferences;
  }
  get keys() {
    return this.params.keys;
  }
  get noTextHighlight() {
    return this.params.noTextHighlight;
  }
  get popupInteractive() {
    // Even if `this.params.popupInteractive` is false, if there's no mouse we
    // should force it to true.
    return this.params.popupInteractive || !this.mouseCapabilityMql;
  }
  get popupStyle() {
    return this.params.popupStyle;
  }
  get posDisplay() {
    return this.params.posDisplay;
  }
  get preferredUnits() {
    return this.params.preferredUnits;
  }
  get puckState() {
    return this.params.puckState;
  }
  get readingOnly() {
    return this.params.readingOnly;
  }
  set readingOnly(value: boolean) {
    this.params.readingOnly = value;
  }
  get showKanjiComponents() {
    return this.params.showKanjiComponents;
  }
  get showPriority() {
    return this.params.showPriority;
  }
  get showPuck(): 'show' | 'hide' {
    return this.params.showPuck === 'auto'
      ? this.canHover
        ? 'hide'
        : 'show'
      : this.params.showPuck;
  }
  get showRomaji() {
    return this.params.showRomaji;
  }
  get tabDisplay() {
    return this.params.tabDisplay;
  }
  get toolbarIcon() {
    return this.params.toolbarIcon;
  }
  get waniKaniVocabDisplay() {
    return this.params.waniKaniVocabDisplay;
  }

  // Extra computed properties
  get canHover() {
    return !!this.hoverCapabilityMql?.matches;
  }

  private onMouseCapabilityChange() {
    // If this.params.popupInteractive is false then any change to the
    // mouseCapabilityMql will cause the computed value of `popupInteractive` to
    // change.
    if (!this.params.popupInteractive) {
      this.notifyListeners([
        { key: 'popupInteractive', value: this.popupInteractive },
      ]);
    }
  }

  private onHoverCapabilityChange(event: MediaQueryListEvent) {
    if (this.params.showPuck === 'auto') {
      this.notifyListeners([
        { key: 'showPuck', value: this.showPuck },
        { key: 'canHover', value: event.matches },
      ]);
    }
  }
}
