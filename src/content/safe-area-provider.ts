import { PaddingBox } from '../utils/geometry';
import {
  getOrCreateEmptyContainer,
  removeContentContainer,
} from './content-container';

import safeAreaProviderStyles from '../../css/safe-area-provider.css';

export interface SafeAreaProviderRenderOptions {
  doc: Document;
}

export interface SafeAreaConsumerDelegate {
  // Called whenever the cached safe area insets
  // are invalidated or set to a new value.
  onSafeAreaUpdated: () => void;
}

export class SafeAreaProvider {
  public static readonly id: string = 'tenten-safe-area-provider';

  private element: HTMLDivElement | undefined;
  private _cachedSafeAreaInsets: PaddingBox | null = null;
  private setCachedSafeAreaInsets(insets: PaddingBox | null) {
    this._cachedSafeAreaInsets = insets;
    this.notifyDelegate();
  }
  delegate: SafeAreaConsumerDelegate | null = null;
  private readonly onResizeObserved = (entries: ResizeObserverEntry[]) => {
    for (const entry of entries) {
      if (entry.contentRect) {
        // contentRect has changed, so invalidate our
        // cached safe area insets.
        this.setCachedSafeAreaInsets(null);
        break;
      }
    }
  };
  private readonly resizeObserver = window.ResizeObserver
    ? new ResizeObserver(this.onResizeObserved)
    : null;
  private readonly notifyDelegate = () => {
    this.delegate?.onSafeAreaUpdated();
  };
  private document: Document = document;

  getSafeArea(): PaddingBox | undefined {
    if (!this.element) {
      return undefined;
    }

    if (this._cachedSafeAreaInsets) {
      return this._cachedSafeAreaInsets;
    }

    const computedStyle = getComputedStyle(this.element);

    this.setCachedSafeAreaInsets({
      top:
        parseFloat(
          computedStyle.getPropertyValue('--tenten-safe-area-inset-top')
        ) || 0,
      right:
        parseFloat(
          computedStyle.getPropertyValue('--tenten-safe-area-inset-right')
        ) || 0,
      bottom:
        parseFloat(
          computedStyle.getPropertyValue('--tenten-safe-area-inset-bottom')
        ) || 0,
      left:
        parseFloat(
          computedStyle.getPropertyValue('--tenten-safe-area-inset-left')
        ) || 0,
    });

    return this._cachedSafeAreaInsets!;
  }

  private readonly onWindowResize = () => {
    this.setCachedSafeAreaInsets(null);
  };

  render({ doc }: SafeAreaProviderRenderOptions): void {
    this.document = doc;

    // Set up shadow tree
    const container = getOrCreateEmptyContainer({
      doc,
      id: SafeAreaProvider.id,
      styles: safeAreaProviderStyles.toString(),
    });

    // Create safe area provider elem
    this.element = doc.createElement('div');
    this.element.classList.add('safe-area-provider');

    container.shadowRoot!.append(this.element);
  }

  enable(): void {
    if (!this.element) {
      return;
    }
    if (this.resizeObserver) {
      // Ideally use ResizeObserver, as it fires updates
      // even whilst the puck is being dragged.
      this.resizeObserver.observe(this.element, { box: 'border-box' });
    } else {
      // Otherwise, fall back to using window "resize" events.
      window.addEventListener('resize', this.onWindowResize);
    }
  }

  unmount(): void {
    removeSafeAreaProvider(this.document);
    this.disable();
    this.element = undefined;
  }

  disable(): void {
    if (this.resizeObserver) {
      if (this.element) {
        this.resizeObserver.unobserve(this.element);
      }
    } else {
      window.removeEventListener('resize', this.onWindowResize);
    }
  }
}

export function removeSafeAreaProvider(doc: Document): void {
  removeContentContainer({ doc, id: SafeAreaProvider.id });
}
