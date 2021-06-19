import Browser from 'webextension-polyfill-ts';

import { ContentConfig } from './content-config';

export interface TabManager {
  init(config: ContentConfig): Promise<void>;
  getEnabledState(): Promise<Array<EnabledState>>;
  toggleTab(tab: Browser.Tabs.Tab, config: ContentConfig): Promise<void>;
  updateConfig(config: ContentConfig): Promise<void>;
  addListener(listener: EnabledChangedCallback): void;
  removeListener(listener: EnabledChangedCallback): void;
}

export type EnabledChangedCallback = (
  enabled: boolean,
  tabId?: number | undefined
) => void;

export type EnabledState = {
  enabled: boolean;
  tabId: number | undefined;
};
