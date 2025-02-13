import { RenderableProps, createContext } from 'preact';
import { useContext } from 'preact/hooks';

// Not every popup option belongs here. This is really just for cross-cutting
// options that we want to be able to toggle from the Cosmos UI.

export type PopupOptionsContextType = { interactive: boolean };

const contextValue: PopupOptionsContextType = { interactive: true };

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
