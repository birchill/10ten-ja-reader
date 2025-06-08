import type { ComponentProps } from 'preact';
import { forwardRef } from 'preact/compat';
import { useId } from 'preact/hooks';

import type { WordResult } from '../background/search-result';
import type {
  AccentDisplay,
  FontFace,
  FontSize,
  PartOfSpeechDisplay,
} from '../common/content-config-params';
import { WordEntry } from '../content/popup/Words/WordEntry';
import { PopupOptionsProvider } from '../content/popup/options-context';
import { classes } from '../utils/classes';
import { useThemeClass } from '../utils/use-theme-class';

type Props = {
  accentDisplay: AccentDisplay;
  fontFace: FontFace;
  fontSize: FontSize;
  onChangeTheme: (theme: string) => void;
  posDisplay: PartOfSpeechDisplay;
  showBunproDecks: boolean;
  showDefinitions: boolean;
  showPriority: boolean;
  showRomaji: boolean;
  showWaniKaniLevel: boolean;
  theme: string;
};

export function PopupThemeRadio(props: Props) {
  return (
    <div class="grid grid-cols-1 sm:grid-cols-2">
      {['default', 'light', 'blue', 'lightblue', 'black', 'yellow'].map(
        (theme) => (
          <PopupRadio
            key={theme}
            name="popupStyle"
            value={theme}
            checked={props.theme === theme}
            onChange={() => props.onChangeTheme(theme)}
          >
            {theme === 'default' ? (
              <div class="stacked">
                <PopupPreview {...props} theme="light" />
                <div class="cover-tl flex">
                  <PopupPreview {...props} theme="black" />
                </div>
              </div>
            ) : (
              <PopupPreview {...props} theme={theme} />
            )}
          </PopupRadio>
        )
      )}
    </div>
  );
}

type InputProps = Omit<
  ComponentProps<'input'>,
  'id' | 'type' | 'class' | 'className'
>;

const PopupRadio = forwardRef<HTMLInputElement, InputProps>(
  (props: InputProps, ref) => {
    const id = useId();

    return (
      <div>
        <input
          ref={ref}
          id={id}
          type="radio"
          class="peer sr-only"
          {...{ ...props, children: undefined }}
        />
        <label
          class={classes(
            'peer-focus-visible:outline-auto group block cursor-pointer rounded-md border border-solid p-2',
            'border-transparent transition duration-300',
            props.checked
              ? 'border-zinc-300 bg-zinc-200 dark:border-zinc-500 dark:bg-zinc-600'
              : 'opacity-50 hover:opacity-100 active:opacity-100'
          )}
          for={id}
        >
          {props.children}
        </label>
      </div>
    );
  }
);

type PopupPreviewProps = {
  accentDisplay: AccentDisplay;
  fontFace: FontFace;
  fontSize: FontSize;
  posDisplay: PartOfSpeechDisplay;
  showBunproDecks: boolean;
  showDefinitions: boolean;
  showPriority: boolean;
  showWaniKaniLevel: boolean;
  showRomaji: boolean;
  theme: string;
};

const demoEntry: WordResult = {
  id: 0,
  k: [
    {
      ent: '理解',
      p: ['i1', 'n1', 'nf02'],
      match: true,
      wk: 21,
      bv: { l: 3 },
      matchRange: [0, 2],
    },
  ],
  r: [{ ent: 'りかい', p: ['i1', 'n1', 'nf02'], a: 1, match: true }],
  s: [{ g: [{ str: 'understanding' }], pos: ['n', 'vt'], match: true }],
  romaji: ['rikai'],
};

function PopupPreview(props: PopupPreviewProps) {
  const themeClass = useThemeClass(props.theme);

  const entryData = { ...demoEntry };
  if (!props.showRomaji) {
    delete entryData.romaji;
  }

  return (
    <div
      id="popup-preview"
      class={classes(
        themeClass,
        'window inline-block min-w-[180px] py-2 text-left',
        props.fontFace === 'bundled' && 'bundled-fonts',
        props.fontSize !== 'normal' && `font-${props.fontSize}`
      )}
    >
      <PopupOptionsProvider interactive={false}>
        <WordEntry
          config={{
            accentDisplay: props.accentDisplay,
            bunproDisplay: props.showBunproDecks,
            posDisplay: props.posDisplay,
            readingOnly: !props.showDefinitions,
            showPriority: props.showPriority,
            waniKaniVocabDisplay: props.showWaniKaniLevel
              ? 'show-matches'
              : 'hide',
            dictLang: 'en',
          }}
          entry={entryData}
          selectState="unselected"
        />
      </PopupOptionsProvider>
    </div>
  );
}
