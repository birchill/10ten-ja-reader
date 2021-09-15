import Browser from 'webextension-polyfill-ts';

import { IndividualFrameMessage, TopFrameMessage } from './background-message';
import { ContentConfig } from './content-config';

export interface TabManager {
  init(config: ContentConfig): Promise<void>;
  getEnabledState(): Promise<Array<EnabledState>>;
  toggleTab(tab: Browser.Tabs.Tab, config: ContentConfig): Promise<void>;
  updateConfig(config: ContentConfig): Promise<void>;
  sendMessageToFrame<T extends Omit<IndividualFrameMessage, 'frame'>>(params: {
    tabId: number;
    message: T;
    frameId: number;
  }): void;
  sendMessageToTopFrame<T extends Omit<TopFrameMessage, 'frame'>>(params: {
    tabId: number;
    message: T;
  }): void;
  getInitialFrameSrc(params: {
    tabId: number;
    frameId: number;
  }): string | undefined;
  addListener(listener: EnabledChangedCallback): void;
  removeListener(listener: EnabledChangedCallback): void;
}

export type EnabledChangedCallback = (params: {
  enabled: boolean;
  tabId?: number | undefined;
  anyEnabled: boolean;
}) => void;

export type EnabledState = {
  enabled: boolean;
  tabId: number | undefined;
};
