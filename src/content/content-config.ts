import { ContentConfigParams } from '../common/content-config-params';
import { getMouseCapabilityMql } from '../utils/device';
import { Entries } from '../utils/type-helpers';

export type ContentConfigChange = {
  [K in keyof ContentConfigParams]: { key: K; value: ContentConfigParams[K] };
}[keyof ContentConfigParams];

export type ContentConfigListener = (
  changes: readonly ContentConfigChange[]
) => void;

export class ContentConfig implements ContentConfigParams {
  private params: ContentConfigParams;
  private mouseCapabilityMql = getMouseCapabilityMql();
  listeners: Array<ContentConfigListener> = [];

  constructor(params: Readonly<ContentConfigParams>) {
    this.set(params);
  }

  set(params: Readonly<ContentConfigParams>) {
    const before = this.params ? { ...this.params } : {};

    this.params = { ...params };

    const changes: ContentConfigChange[] = [];
    for (const [key, value] of Object.entries(
      before
    ) as Entries<ContentConfigParams>) {
      // Currently we are only interested in a few keys that happen to have
      // primitive values. If we ever want to report on changes to array/object
      // values we'll need to do a deep equality check.
      if (typeof value === 'object') {
        continue;
      }

      if (this[key] !== value) {
        changes.push({ key, value: this[key] } as ContentConfigChange);
      }
    }

    this.notifyListeners(changes);
  }

  addListener(listener: ContentConfigListener) {
    if (!this.listeners.includes(listener)) {
      this.listeners.push(listener);
    }
  }

  removeListener(listener: ContentConfigListener) {
    this.listeners = this.listeners.filter((l) => l !== listener);
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
  get dictLang() {
    return this.params.dictLang;
  }
  get fx() {
    return this.params.fx;
  }
  get hasDismissedMouseOnboarding() {
    return this.params.hasDismissedMouseOnboarding;
  }
  get hasUpgradedFromPreMouse() {
    return this.params.hasUpgradedFromPreMouse;
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
  get showPuck() {
    return this.params.showPuck;
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
}
