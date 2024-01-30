import type { Events } from 'webextension-polyfill';

declare module 'webextension-polyfill' {
  namespace Runtime {
    interface Static {
      onPerformanceWarning?: Events.Event<
        (details: OnPerformanceWarningDetailsType) => void
      >;
    }

    interface OnPerformanceWarningDetailsType {
      category: 'content_script';
      severity: 'low' | 'medium' | 'high';
      tabId?: number;
      description: string;
    }
  }
}
