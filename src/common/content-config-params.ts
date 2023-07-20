export type HighlightStyle = 'yellow' | 'blue';

// Keyboard shortcut keys. Each of these is an array of keycodes (as reported
// by KeyboardEvent.key). The array may be empty in which case the action is
// effectively disabled.
export interface KeyboardKeys {
  // The key(s) to toggle display of the definition vs reading-only.
  toggleDefinition: string[];

  // The key(s) to cycle through the available dictionaries.
  nextDictionary: string[];

  // The key(s) to force kanji-only lookup.
  kanjiLookup: string[];

  // The key(s) to close the popup.
  closePopup: string[];

  // The key(s) to pin the popup.
  pinPopup: string[];

  // The key(s) to move the popup up.
  movePopupUp: string[];

  // The key(s) to move the popup down.
  movePopupDown: string[];

  // The key(s) to entry copy mode.
  startCopy: string[];
}

export type AccentDisplay =
  | 'downstep'
  | 'binary'
  | 'binary-hi-contrast'
  | 'none';

export type FontSize = 'normal' | 'large' | 'xl';

export type PartOfSpeechDisplay = 'expl' | 'code' | 'none';

export type TabDisplay = 'top' | 'left' | 'right' | 'none';

export interface ContentConfigParams {
  // Indicates the type of display to use for showing pitch accent information.
  accentDisplay: AccentDisplay;

  // The preferred language for dictionary content.
  dictLang: string;

  // The preferred currency to convert to, along with its rate and the timestamp
  // for the rate.
  fx: { currency: string; rate: number; timestamp: number } | undefined;

  // The font size to use for the popup.
  fontSize: FontSize;

  // True if the user has performed any action that means we should no longer
  // show the mouse onboarding banner.
  hasDismissedMouseOnboarding: boolean;

  // True if the user has upgraded from a version prior to 1.12
  hasUpgradedFromPreMouse: boolean;

  // The colors etc. to use for highlighting text when using the CSS Highlight
  // API etc.
  highlightStyle: HighlightStyle;

  // Modifier keys which must be held down in order for the pop-up to shown.
  //
  // This should be a Set but Chrome can't send Sets by sendMessage :(
  holdToShowKeys: Array<'Alt' | 'Ctrl'>;

  // As above but specifically for images.
  holdToShowImageKeys: Array<'Alt' | 'Ctrl'>;

  // References to show in the kanji view.
  kanjiReferences: Array<import('./refs').ReferenceAbbreviation>;

  // Keyboard shortcut keys. Each of these is an array of keycodes (as reported
  // by KeyboardEvent.key). The array may be empty in which case the action is
  // not possible via keyboard.
  keys: KeyboardKeys;

  // Prevents highlighting text on hover
  noTextHighlight: boolean;

  // If the popup should be interactive (e.g. response to mouse clicks)
  popupInteractive: boolean;

  // The theme in use, e.g. 'blue'.
  popupStyle: string;

  // Indicates the type of display to use for part-of-speech labels.
  posDisplay: PartOfSpeechDisplay;

  // True if only the reading (and not the definition) should be shown.
  readingOnly: boolean;

  // True if the components of the kanji should be shown alongside it.
  showKanjiComponents: boolean;

  // True if we should show indicators next to common words.
  showPriority: boolean;

  // Should we show the puck or not?
  showPuck: 'show' | 'hide' | 'auto';

  // True if we should show romaji alongside each reading.
  showRomaji: boolean;

  // Indicates the orientation / visibility of the popup tab bar.
  tabDisplay: TabDisplay;

  // The icon we show on the toolbar. We mirror this in the puck so we need to
  // let the content script now about it.
  toolbarIcon: 'default' | 'sky';
}
