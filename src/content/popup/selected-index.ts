import { PopupOptions } from './render-popup';

export function getSelectedIndex(options: PopupOptions, numEntries: number) {
  return options.copyState.kind !== 'inactive' && numEntries
    ? options.copyState.index % numEntries
    : -1;
}
