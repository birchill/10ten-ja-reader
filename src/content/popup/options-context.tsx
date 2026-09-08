import type { RenderableProps } from 'preact';
import { createContext } from 'preact';
import { useContext } from 'preact/hooks';

import type { FontSize } from '../../common/content-config-params';

export type PopupOptionsContextType = {
  interactive: boolean;
  fontSize?: FontSize;
  playReadingsShortcuts?: ReadonlyArray<string>;
};

const contextValue: PopupOptionsContextType = {
  interactive: true,
  fontSize: undefined,
};

const popupOptionsContext =
  createContext<PopupOptionsContextType>(contextValue);

type PopupOptionsProviderProps = PopupOptionsContextType;

export function PopupOptionsProvider(
  props: RenderableProps<PopupOptionsProviderProps>
) {
  return (
    <popupOptionsContext.Provider value={props}>
      {props.children}
    </popupOptionsContext.Provider>
  );
}

export function usePopupOptions(): PopupOptionsContextType {
  return useContext(popupOptionsContext);
}
