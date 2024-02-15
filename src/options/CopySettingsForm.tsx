import { useLocale } from '../common/i18n';
import { getTextToCopy } from '../content/copy-text';

import { CheckboxRow } from './CheckboxRow';
import { NewBadge } from './NewBadge';

type Props = {
  simplifiedCopy: boolean;
  showRomaji?: boolean;
  onChangeSimplifiedCopy: (value: boolean) => void;
};

export function CopySettingsForm(props: Props) {
  const { t } = useLocale();

  return (
    <div class="flex flex-col gap-4">
      <CheckboxRow>
        <input
          id="simplifiedCopy"
          name="simplifiedCopy"
          type="checkbox"
          checked={props.simplifiedCopy}
          onChange={(e) =>
            props.onChangeSimplifiedCopy(e.currentTarget.checked)
          }
        />
        <label for="simplifiedCopy">
          {t('options_simplified_copy')}
          <NewBadge expiry={new Date('2024-05-01')} />
        </label>
      </CheckboxRow>
      <div class="rounded-lg border border-solid border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800">
        <p class="m-0 mb-2 text-xs text-zinc-500 dark:text-zinc-400">
          {t('options_copy_preview')}
        </p>
        <code class="whitespace-pre-wrap text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {getTextToCopy({
            entry: {
              type: 'word',
              data: {
                id: 1704220,
                k: [
                  { ent: '転々', p: ['n1', 'nf15'], match: true, bv: { l: 3 } },
                  { ent: '転転', match: true },
                ],
                r: [
                  {
                    ent: 'てんてん',
                    p: ['n1', 'nf15'],
                    a: [{ i: 0 }, { i: 3 }],
                    match: true,
                    matchRange: [0, 4],
                  },
                ],
                s: [
                  {
                    g: [
                      { str: 'moving from place to place' },
                      { str: 'being passed around repeatedly' },
                    ],
                    pos: ['adv', 'adv-to', 'n', 'vs'],
                    match: true,
                  },
                  {
                    g: [{ str: 'rolling about' }],
                    pos: ['adv', 'adv-to', 'n', 'vs'],
                    match: true,
                  },
                ],
                romaji: props.showRomaji ? ['tenten'] : undefined,
              },
            },
            copyType: 'entry',
            getMessage,
            includeAllSenses: !props.simplifiedCopy,
            includeLessCommonHeadwords: !props.simplifiedCopy,
            includePartOfSpeech: !props.simplifiedCopy,
          })}
        </code>
      </div>
    </div>
  );
}

function getMessage(id: string) {
  return id;
}
