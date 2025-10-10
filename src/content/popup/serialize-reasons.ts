import type { Reason } from '../../background/deinflect';
import { deinflectL10NKeys } from '../../background/deinflect';
import type { TranslateFunctionType } from '../../common/i18n';

export function serializeReasonChains(
  reasonChains: Array<Array<Reason>>,
  t: TranslateFunctionType
): string {
  return (
    '< ' +
    reasonChains
      .map((reasonList) =>
        reasonList.map((reason) => t(deinflectL10NKeys[reason])).join(' < ')
      )
      .join(t('deinflect_alternate'))
  );
}
