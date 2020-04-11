// This may grow into some union of different meta-like things, but for now it's
// just used for representing years marked with Japanese eras.

export type SelectionMeta = {
  era: string;
  // 0 here represents that the matched text used 元年 (equivalent to 1 but we
  // might want to display it differently).
  year: number;
  // The length of the text that matched
  matchLen: number;
};
