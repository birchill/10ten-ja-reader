import { h } from 'preact';

import type { ContentConfigParams } from '../../common/content-config-params';
import { html } from '../../utils/builder';

import type { SelectionMeta } from '../meta';

import { MetadataContainer } from './Metadata/MetadataContainer';
import { mountPopupComponent } from './mount';

export function renderMetadata(props: {
  fxData: ContentConfigParams['fx'];
  preferredUnits: ContentConfigParams['preferredUnits'];
  isCombinedResult: boolean;
  matchLen: number;
  meta: SelectionMeta;
  metaonly?: boolean;
}): HTMLElement | null {
  const container = html('div');
  mountPopupComponent(container, h(MetadataContainer, { ...props }));
  return container;
}
