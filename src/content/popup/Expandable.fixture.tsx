import { Fragment } from 'preact';
import { useFixtureInput } from 'react-cosmos/client';

import { Expandable } from './Expandable';

// Note that we deliberately avoid Tailwind classes for the scaffolding here
// since the fixtures are included in the Tailwind source scan and we don't want
// to add utilities to the shipped stylesheet just for this fixture.

export default () => {
  const [isExpanded, setIsExpanded] = useFixtureInput('expanded', false);
  const [showKeyboardShortcut] = useFixtureInput('keyboard shortcut', true);
  const [entries] = useFixtureInput('entries', 6);
  const [foldAfter] = useFixtureInput('fold after', 2);
  const [maxHeight] = useFixtureInput('max height (0 = none)', 0);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        maxHeight: maxHeight ? `${maxHeight}px` : undefined,
      }}
    >
      <Expandable
        expandShortcuts={['Shift', 'Enter']}
        isExpanded={isExpanded}
        onExpandPopup={() => setIsExpanded(true)}
        showKeyboardShortcut={showKeyboardShortcut}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {Array.from({ length: Math.max(entries, 0) }, (_, i) => (
            <Fragment key={i}>
              {/* The fold point is where we collapse the content to */}
              {i === foldAfter && <div class="fold-point tp:contents" />}
              <div
                class="tp:snap-start tp:scroll-mb-(--expand-button-allowance)"
                style={{
                  padding: '0.5em 1em',
                  borderBottom: '1px solid var(--border-color)',
                }}
              >
                <div>Entry {i + 1}</div>
                {/* Vary the height of the entries a little */}
                {Array.from({ length: (i % 3) + 1 }, (_, j) => (
                  <div key={j} style={{ opacity: 0.6 }}>
                    Some entry content
                  </div>
                ))}
              </div>
            </Fragment>
          ))}
        </div>
      </Expandable>
    </div>
  );
};
