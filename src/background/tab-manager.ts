import { Tabs } from 'webextension-polyfill';

import { ContentConfigParams } from '../common/content-config-params';

import { IndividualFrameMessage, TopFrameMessage } from './background-message';

export interface TabManager {
  init(config: ContentConfigParams): Promise<void>;
  getEnabledState(): Promise<Array<EnabledState>>;
  toggleTab(
    tab: Tabs.Tab | undefined,
    config: ContentConfigParams
  ): Promise<void>;
  updateConfig(config: ContentConfigParams): Promise<void>;
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

export type EnabledState = { enabled: boolean; tabId: number | undefined };
