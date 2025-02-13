import { useLocale } from '../../../common/i18n';
import { classes } from '../../../utils/classes';

import { ShogiMeta, serializeShogi, serializeShogiDest } from '../../shogi';

type Props = { meta: ShogiMeta };

export function ShogiInfo({ meta }: Props) {
  const { t, langTag } = useLocale();

  // For Chinese we use the Japanese expansion anyway
  const lang = langTag === 'zh_CN' ? 'ja' : langTag;

  // Side
  const side = meta.side ? t(`shogi_side_${meta.side}`) : undefined;

  // Piece
  const piece = t(`shogi_piece_${meta.piece}`);

  // Destination
  let dest: string;
  if (meta.dest) {
    dest =
      lang === 'ja'
        ? serializeShogiDest(meta.dest)
        : meta.dest.slice(0, 2).map(String).join('');
    if (meta.dest.length === 3) {
      dest += t('shogi_dest_same_suffix');
    }
  } else {
    dest = t('shogi_dest_same');
  }

  // Movement
  const movement = meta.movement
    ? t(`shogi_movement_${meta.movement}`)
    : undefined;

  // Get the combined string
  let move: string;
  if (side && movement) {
    move = t('shogi_move_side_piece_dest_movement', [
      side,
      piece,
      dest,
      movement,
    ]);
  } else if (side) {
    move = t('shogi_move_side_piece_dest', [side, piece, dest]);
  } else if (movement) {
    move = t('shogi_move_piece_dest_movement', [piece, dest, movement]);
  } else {
    move = t('shogi_move_piece_dest', [piece, dest]);
  }

  // Add promotion annotation
  if (typeof meta.promotion === 'boolean') {
    move += t(
      meta.promotion ? 'shogi_promoted_suffix' : 'shogi_not_promoted_suffix'
    );
  }

  return (
    <div>
      <span
        class={classes(
          'tp-text-2xs tp-rounded tp-mr-1 tp-px-1 whitespace-nowrap',
          'tp-border-solid tp-border tp-border-[--tag-border]'
        )}
        lang={langTag}
      >
        {t('shogi_label')}
      </span>
      <span lang="ja">{serializeShogi(meta)}</span>
      <span class="tp-px-1.5">=</span>
      <span id="shogi-move">{move}</span>
    </div>
  );
}
