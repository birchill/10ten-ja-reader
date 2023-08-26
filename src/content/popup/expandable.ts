import browser from 'webextension-polyfill';

import { html, svg } from '../../utils/builder';
import { round } from '../../utils/round';

export function updateExpandable(
  expandable: HTMLElement,
  options: {
    expandShortcuts?: ReadonlyArray<string>;
    isExpanded: boolean;
    onExpandPopup?: () => void;
    showKeyboardShortcut?: boolean;
  }
) {
  if (options.isExpanded) {
    // We style kanji content differently depending on whether or not we're in
    // the (manually) expanded state.
    //
    // Specifically, when we're not expanded, we lay out the kanji in a grid
    // such that each kanji table has the same height so that you can scroll
    // through the kanji one-by-one and even if later kanji tables are bigger,
    // they still fit in the popup.
    //
    // When the popup is expanded, however, that's not necessary. Ironically,
    // that means that the "expanded" state is actually smaller than the
    // "collapsed" state.
    expandable.classList.add('expanded');

    // In all cases, if we're in the (manually) expanded state we never need to
    // worry about constraining the height or showing the expand button so we're
    // done here.
    return;
  }

  // Calculate the preferred expanded height
  //
  // Note that this is the height _before_ adding the expand button.
  // i.e. if we have this much room, we don't need the expand button and the
  // extra space it requires.
  const { top: expandableTop, height: expandedHeight } =
    expandable.getBoundingClientRect();

  // Calculate the collapsed height
  const foldPoint = getFoldPoint(expandable);
  const collapsedHeight =
    foldPoint === null ? expandedHeight : foldPoint - expandableTop;

  // Work out if we are effectively collapsed
  //
  // Note that "effectively" collapsed is not quite the same as
  // `!options.isExpanded` as if we have no fold point (or the fold point occurs
  // at the end of the content) then even if `options.isExpanded` is false,
  // we are not collapsed.
  //
  // This is almost always going to be the same as `foldPoint !== null` but just
  // in case we add a fold point at the end of the content we compare the
  // collapsedHeight to the expandedHeight.
  const isCollapsed = expandedHeight - collapsedHeight > 1;

  // Set an explicit height on the expandable so that we can add a
  // `position: sticky` expand button without it affecting the height.
  expandable.style.height = isCollapsed
    ? // Add in some extra space for the expand button
      `calc(${round(collapsedHeight, 2)}px + var(--expand-button-allowance))`
    : `${expandedHeight}px`;

  // Add a `position: sticky` expand button to the bottom of the content
  const label = browser.i18n.getMessage('popup_expand_label');
  const title = options.expandShortcuts?.length
    ? `${label} (${options.expandShortcuts.join(' / ')})`
    : label;
  const expandButton = html(
    'button',
    { class: 'expand-button', title, type: 'button' },
    svg(
      'svg',
      { class: 'icon', viewBox: '0 0 24 24', role: 'presentation' },
      svg('path', {
        fill: 'currentColor',
        d: 'M21 6c1.7 0 2.6 2 1.4 3.2L13.5 20c-.7.9-2.3.9-3 0L1.6 9.2C.4 8 1.3 6 3 6h18z',
      })
    )
  );
  expandButton.addEventListener('click', () => {
    options.onExpandPopup?.();
  });
  if (options.showKeyboardShortcut && options.expandShortcuts?.length) {
    expandButton.append(html('kbd', {}, options.expandShortcuts[0]));
  }
  expandable.append(expandButton);

  // Hide the button if we are not currently collapsed
  if (!isCollapsed) {
    expandButton.style.display = 'none';
  }

  // Hide/show the expand button in response to changes to the available content
  // height.
  //
  // There are two cases where this is necessary.
  //
  // a) Once we apply any height constraints to the popup, even if there is no
  //    fold point, there might not be enough room for the content so we want
  //    to show the expand button to provide a consistent experience.
  //
  //    (The user doesn't care if the content is hidden due to the popup height
  //    constraints or self-inflicted "hide everything below the fold point"
  //    constraints. They just expect to be able to press the expand button to
  //    see everything.)
  //
  //    However, until we actually position the popup and possibly constrain its
  //    height we won't know whether or not the content fits.
  //
  // b) A specific case where we actually enlarge the content area by activating
  //    and then clearing the copy overlay:
  //
  //    1. The expandable is collapsed.
  //    2. The user clicks on the top entry to activate the copy screen
  //       overlay.
  //    3. When the copy screen overlay is active, we enlarge the size of the
  //       popup so that all the copy buttons are visible.
  //    4. Then, when the user exits copy mode we ensure that the height
  //       doesn't change (unless they've pinned the window) so that they don't
  //       suddenly find themselves in a situation where their mouse is outside
  //       the window.
  //
  //    At this point, depending on the size of the content being shown, we can
  //    arrive at a situation where the content in the expandable is fully
  //    visible, despite having a fold point.
  //
  //    If we continue showing the expand button in that situation it not only
  //    looks odd, if the user _were_ to click it the window would shrink
  //    leaving their mouse outside of it.
  //
  //    We _could_ handle this by simply forcing the popup to be expanded as
  //    soon as the user ends copy mode. That would be simplest but it sometimes
  //    means that when you go to copy an entry the popup becomes MASSIVE which
  //    is not the nicest user experience.
  //
  //    Instead, we try to do the nice thing and expand the popup just enough
  //    to show the copy controls, then keep it just that big when the user
  //    exits copy mode.
  //
  const resizeObserver = new ResizeObserver(
    (entries: Array<ResizeObserverEntry>) => {
      for (const entry of entries) {
        const { blockSize: expandableRenderedHeight } = entry.contentBoxSize[0];
        if (!expandableRenderedHeight) {
          return;
        }

        // From my tests in Firefox and Chrome, even if we refer to the button
        // via `expandButton`, once the popup is removed from the DOM, the
        // ResizeObserver closure is successfully garbage/cycle collected
        // (despite claims to the contrary [1][2]).
        //
        // With Safari I don't know what is going on. It never seems to reclaim
        // the memory but that might just be because garbage collection is very
        // lazy.
        //
        // In any case, it's probably safer to _not_ hold onto a reference to
        // the expandable or any of its contents and instead look up the button
        // from the ResizeObserver entry.
        //
        // [1] https://github.com/w3c/csswg-drafts/issues/5155#issuecomment-1382387212
        // [2] https://bugzilla.mozilla.org/show_bug.cgi?id=1596992#c10

        const button =
          entry.target.querySelector<HTMLElement>('.expand-button');
        if (!button) {
          return;
        }

        button.style.display =
          expandedHeight - expandableRenderedHeight < 1 ? 'none' : '';
      }
    }
  );
  resizeObserver.observe(expandable);

  // Turn on scroll snapping after the window has been resized
  //
  // In Firefox we can set this from the outset but for Chrome and Safari if
  // we do that, it seems like we end up re-snapping at some point and the list
  // jumps randomly, often to somewhere in the middle or end.
  requestAnimationFrame(() => {
    expandable.style.scrollSnapType = 'y mandatory';
  });
}

function getFoldPoint(expandable: HTMLElement): number | null {
  const foldPointElem = expandable.querySelector('.fold-point');
  if (!foldPointElem) {
    return null;
  }

  // The fold point is `display: contents` so that it doesn't affect the layout
  // of any grid or flex elements it is added too but that also means that we
  // can't measure it's position directly.
  //
  // Instead we take the point between its direct siblings.
  const prev = foldPointElem.previousElementSibling;
  const next = foldPointElem.nextElementSibling;
  if (!prev || !next) {
    return null;
  }
  const { bottom: previousBottom } = prev.getBoundingClientRect();
  const { top: nextTop } = next.getBoundingClientRect();

  return previousBottom + (nextTop - previousBottom) / 2;
}
