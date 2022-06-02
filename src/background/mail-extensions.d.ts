import { Events, Tabs } from 'webextension-polyfill-ts';

// Mail extension extensions
//
// (Just the parts we use)

declare module 'webextension-polyfill-ts' {
  type OnClickDataModifiersItemEnum =
    | 'Shift'
    | 'Alt'
    | 'Command'
    | 'Ctrl'
    | 'MacCtrl';

  interface OnClickData {
    modifiers: OnClickDataModifiersItemEnum[];
    button?: number;
  }

  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ComposeAction {
    interface Static {
      onClicked: Events.Event<
        (tab: Tabs.Tab, info: OnClickData | undefined) => void
      >;
      setTitle(details: { title: string | null }): Promise<void>;
      setIcon(details: {
        imageData?: unknown | { [s: string]: unknown };
        path?: string | { [s: string]: string };
      }): Promise<void>;
      setBadgeText(details: { text: string | null }): Promise<void>;
      setBadgeBackgroundColor(details: {
        color: string | [number, number, number, number] | null;
      }): Promise<void>;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Windows {
    type MailWindowType =
      | WindowType
      | 'addressBook'
      | 'messageCompose'
      | 'messageDisplay';

    interface MailGetAllGetInfoType extends GetInfo {
      windowTypes?: MailWindowType[];
    }

    interface Static {
      getAll(getInfo?: MailGetAllGetInfoType): Promise<Window[]>;
    }
  }

  type ExtensionFileOrCode = { code: string } | { file: string };

  interface RegisteredScriptOptions {
    css?: Array<ExtensionFileOrCode>;
    js?: Array<ExtensionFileOrCode>;
  }

  interface RegisteredScript {
    unregister: () => void;
  }

  interface Browser {
    composeAction?: ComposeAction.Static;
    composeScripts?: {
      register(options: RegisteredScriptOptions): Promise<RegisteredScript>;
    };
    messageDisplayScripts?: {
      register(options: RegisteredScriptOptions): Promise<RegisteredScript>;
    };
  }
}
