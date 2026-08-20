import type { RenderableProps } from 'preact';
import { useLayoutEffect, useRef } from 'preact/hooks';

import { useLocale } from '../../common/i18n';
import { classes } from '../../utils/classes';
import { round } from '../../utils/round';

export type ExpandableProps = {
  expandShortcuts?: ReadonlyArray<string>;
  isExpanded: boolean;
  onExpandPopup?: () => void;
  showKeyboardShortcut?: boolean;
};

export function Expandable(props: RenderableProps<ExpandableProps>) {
  const { isExpanded } = props;
  const { t } = useLocale();

  const container = useRef<HTMLDivElement>(null);
  const expandButton = useRef<HTMLButtonElement>(null);

  // Note that we deliberately don't specify any dependencies here since we need
  // to re-measure the content whenever it changes.
  useLayoutEffect(() => {
    const expandable = container.current!;

    // Drop any height / scroll snapping we applied on a previous pass so that
    // we can measure the content afresh.
    expandable.style.height = '';
    expandable.style.scrollSnapType = '';

    // In the (manually) expanded state we never need to worry about
    // constraining the height or showing the expand button so we're done here.
    //
    // (Note that we style kanji content differently depending on whether or not
    // we're in the expanded state. Specifically, when we're not expanded, we lay
    // out the kanji in a grid such that each kanji table has the same height so
    // that you can scroll through the kanji one-by-one and even if later kanji
    // tables are bigger, they still fit in the popup.
    //
    // When the popup is expanded, however, that's not necessary. Ironically,
    // that means that the "expanded" state is actually smaller than the
    // "collapsed" state.)
    if (isExpanded) {
      return;
    }

    const button = expandButton.current!;

    // Calculate the preferred expanded height
    //
    // Note that this is the height _before_ adding the expand button.
    // i.e. if we have this much room, we don't need the expand button and the
    // extra space it requires.
    button.style.display = 'none';
    const { top: expandableTop, height: expandedHeight } =
      expandable.getBoundingClientRect();

    // Calculate the collapsed height
    const foldPoint = getFoldPoint(expandable);
    const collapsedHeight =
      foldPoint === null ? expandedHeight : foldPoint - expandableTop;

    // Work out if we are effectively collapsed
    //
    // Note that "effectively" collapsed is not quite the same as `!isExpanded`
    // as if we have no fold point (or the fold point occurs at the end of the
    // content) then even if `isExpanded` is false, we are not collapsed.
    //
    // This is almost always going to be the same as `foldPoint !== null` but
    // just in case we add a fold point at the end of the content we compare the
    // collapsedHeight to the expandedHeight.
    const isCollapsed = expandedHeight - collapsedHeight > 1;

    // Set an explicit height on the expandable so that the `position: sticky`
    // expand button doesn't affect the height.
    expandable.style.height = isCollapsed
      ? // Add in some extra space for the expand button
        `calc(${round(collapsedHeight, 2)}px + var(--expand-button-allowance))`
      : `${expandedHeight}px`;

    // Only show the button if we are currently collapsed
    button.style.display = isCollapsed ? '' : 'none';

    // Hide/show the expand button in response to changes to the available
    // content height.
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
    //    However, until we actually position the popup and possibly constrain
    //    its height we won't know whether or not the content fits.
    //
    // b) A specific case where we actually enlarge the content area by
    //    activating and then clearing the copy overlay:
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
    //    soon as the user ends copy mode. That would be simplest but it
    //    sometimes means that when you go to copy an entry the popup becomes
    //    MASSIVE which is not the nicest user experience.
    //
    //    Instead, we try to do the nice thing and expand the popup just enough
    //    to show the copy controls, then keep it just that big when the user
    //    exits copy mode.
    //
    const resizeObserver = new ResizeObserver(
      (entries: Array<ResizeObserverEntry>) => {
        for (const entry of entries) {
          const { blockSize: expandableRenderedHeight } =
            entry.contentBoxSize[0];
          if (!expandableRenderedHeight) {
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
    const snapHandle = requestAnimationFrame(() => {
      expandable.style.scrollSnapType = 'y mandatory';
    });

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(snapHandle);
    };
  });

  const label = t('popup_expand_label');
  const title = props.expandShortcuts?.length
    ? `${label} (${props.expandShortcuts.join(' / ')})`
    : label;

  return (
    <div
      class={classes(
        'thin-scrollbars',
        'tp:overflow-auto tp:overscroll-contain tp:[scrollbar-gutter:stable]',
        // Extra space to add to the end of the content so the expand button
        // doesn't overlap with the last entry.
        'tp:[--expand-button-allowance:35px]'
      )}
      data-type="expandable"
      data-expanded={isExpanded || undefined}
      ref={container}
    >
      {props.children}
      {!isExpanded && (
        <button
          class={classes(
            // Box layout
            'tp:flex tp:items-center tp:justify-center tp:w-full tp:p-[8px]',
            // Positioning
            'tp:sticky tp:bottom-0',
            // Reset button styles
            'tp:appearance-none tp:border-0 tp:m-0 tp:cursor-pointer',
            'tp:[font:inherit] tp:no-underline',
            // Colors
            'tp:bg-transparent',
            'tp:bg-linear-to-b tp:from-[rgba(var(--bg-rgb),0.3)]',
            'tp:to-(--bg-color) tp:to-80%',
            'tp:text-[rgba(var(--expand-button-rgb),0.8)]',
            'tp:hover:from-[rgba(var(--bg-rgb),0.8)]',
            'tp:hover:text-(--expand-button-color)',
            // Use an outline instead of a border so it doesn't affect the layout
            // (even if we try to reserve space for the border using a
            // transparent border it will not blend with the underlying element
            // since you can't have a fully transparent border on a
            // non-transparent background).
            'tp:hover:outline tp:hover:outline-dotted',
            'tp:hover:outline-(--expand-button-color)'
          )}
          onClick={props.onExpandPopup}
          ref={expandButton}
          title={title}
          type="button"
        >
          <svg
            class="tp:size-[16px] tp:grow"
            role="presentation"
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              d="M21 6c1.7 0 2.6 2 1.4 3.2L13.5 20c-.7.9-2.3.9-3 0L1.6 9.2C.4 8 1.3 6 3 6h18z"
            />
          </svg>
          {props.showKeyboardShortcut && !!props.expandShortcuts?.length && (
            <kbd
              class={classes(
                'tp:leading-none tp:font-[monospace] tp:font-extrabold',
                'tp:py-0.5 tp:px-1 tp:rounded-sm',
                'tp:text-(--expand-button-color) tp:bg-white/10',
                'tp:border tp:border-(--expand-button-color)'
              )}
            >
              {props.expandShortcuts[0]}
            </kbd>
          )}
        </button>
      )}
    </div>
  );
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
