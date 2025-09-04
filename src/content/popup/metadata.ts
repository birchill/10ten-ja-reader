import { h, render } from 'preact';

import type { ContentConfigParams } from '../../common/content-config-params';
import { html } from '../../utils/builder';

import type { SelectionMeta } from '../meta';

import { MetadataContainer } from './Metadata/MetadataContainer';

export function renderMetadata(props: {
  fxData: ContentConfigParams['fx'];
  preferredUnits: ContentConfigParams['preferredUnits'];
  isCombinedResult: boolean;
  matchLen: number;
  meta: SelectionMeta;
  metaonly?: boolean;
}): HTMLElement | null {
  const container = html('div');
  render(h(MetadataContainer, { ...props }), container);
  return container;
}
