/// <reference path="../common/css.d.ts" />
import safeAreaProviderStyles from '../../css/safe-area-provider.css?inline';

import { PaddingBox } from '../utils/geometry';

import {
  getOrCreateEmptyContainer,
  removeContentContainer,
} from './content-container';

export type SafeAreaChangeListener = (safeArea: PaddingBox | null) => void;

export class SafeAreaProvider {
  public static readonly id: string = 'tenten-safe-area-provider';

  private cachedSafeArea: PaddingBox | null = null;

  private element: HTMLDivElement | undefined;
  private resizeObserver: ResizeObserver | undefined;

  private listeners: Array<SafeAreaChangeListener> = [];

  getSafeArea(): PaddingBox {
    const safeAreaElem = this.element || this.startListening();

    if (this.cachedSafeArea) {
      return this.cachedSafeArea;
    }

    const computedStyle = getComputedStyle(safeAreaElem);
    const safeArea: PaddingBox = {
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
    };

    this.setCachedSafeArea(safeArea);

    return safeArea;
  }

  destroy() {
    this.stopListening();
  }

  //
  // Listeners
  //

  addEventListener(listener: SafeAreaChangeListener) {
    if (this.listeners.includes(listener)) {
      return;
    }
    this.listeners.push(listener);
  }

  removeEventListener(listener: SafeAreaChangeListener) {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  //
  // Implementation helpers
  //

  private startListening() {
    // Set up shadow tree
    const container = getOrCreateEmptyContainer({
      id: SafeAreaProvider.id,
      styles: safeAreaProviderStyles.toString(),
    });

    // Create safe area provider element
    this.element = document.createElement('div');
    this.element.classList.add('safe-area-provider');

    container.shadowRoot!.append(this.element);

    // Listen for changes
    if ('ResizeObserver' in window) {
      // Ideally use ResizeObserver, as it fires updates even whilst the puck
      // is being dragged.
      this.resizeObserver = new ResizeObserver(this.onResizeObserved);
      this.resizeObserver.observe(this.element, { box: 'border-box' });
    } else {
      // Otherwise, fall back to using window "resize" events.
      (window as Window).addEventListener('resize', this.onWindowResize);
    }

    return this.element;
  }

  private stopListening() {
    // Stop listening
    if (this.resizeObserver) {
      if (this.element) {
        this.resizeObserver.unobserve(this.element);
      }
      this.resizeObserver = undefined;
    } else {
      window.removeEventListener('resize', this.onWindowResize);
    }

    // Drop the element
    removeSafeAreaProvider();
    this.element = undefined;
  }

  private setCachedSafeArea(safeArea: PaddingBox | null) {
    this.cachedSafeArea = safeArea;
    this.notifyListeners(safeArea);
  }

  private notifyListeners(safeArea: PaddingBox | null) {
    const listenersCopy = [...this.listeners];
    for (const listener of listenersCopy) {
      listener(safeArea);
    }
  }

  private readonly onResizeObserved = (entries: ResizeObserverEntry[]) => {
    for (const entry of entries) {
      if (entry.contentRect) {
        // contentRect has changed, so invalidate our cached safe area insets.
        this.setCachedSafeArea(null);
        break;
      }
    }
  };

  private readonly onWindowResize = () => {
    this.setCachedSafeArea(null);
  };
}

// We expose this separately so that when the extension is upgraded, we can
// clear up any artifacts left behind by the previous version.
export function removeSafeAreaProvider(): void {
  removeContentContainer(SafeAreaProvider.id);
}
