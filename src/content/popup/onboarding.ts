import { browser } from 'webextension-polyfill-ts';

import { html, svg } from '../../utils/builder';

export function renderMouseOnboarding(
  options: {
    onDismiss?: (options?: { disable?: boolean }) => void;
  } = {}
): HTMLElement {
  const container = html('div', { class: 'onboarding' });

  const okButton = html(
    'button',
    { class: 'primary' },
    browser.i18n.getMessage('content_mouse_onboarding_ok_button')
  );
  if (options.onDismiss) {
    okButton.addEventListener('click', (evt) => {
      evt.preventDefault();
      container.classList.add('dismissed');
      options.onDismiss!();
    });
  }

  const disableButton = html(
    'button',
    {},
    browser.i18n.getMessage('content_mouse_onboarding_disable_button')
  );
  if (options.onDismiss) {
    disableButton.addEventListener('click', (evt) => {
      evt.preventDefault();
      container.classList.add('dismissed');
      options.onDismiss!({ disable: true });
    });
  }

  container.append(
    html(
      'div',
      { class: 'image-and-text-container' },
      html(
        'div',
        { class: 'text' },
        html(
          'div',
          { class: 'explanation' },
          html(
            'strong',
            {},
            browser.i18n.getMessage('content_mouse_onboarding_new')
          ),
          html('span', {}, ' '),
          html(
            'span',
            {},
            browser.i18n.getMessage('content_mouse_onboarding_explanation')
          ),
          html('span', {}, ' '),
          html(
            'a',
            { href: '#' },
            browser.i18n.getMessage('content_mouse_onboarding_details_link')
          )
        ),
        html('div', { class: 'button-group' }, okButton, disableButton)
      ),
      html(
        'div',
        { class: 'icon' },
        svg(
          'svg',
          { viewBox: '0 20 200 130' },
          svg(
            'defs',
            {},
            svg(
              'symbol',
              {
                id: 'cursor',
                viewBox: '0 0 29.3 33.3',
                width: '29.3',
                height: '33.3',
              },
              svg('path', {
                fill: 'white',
                d: 'M2.3 2.94l6.9 26.2 4.6-5.8 7.1 7.9 5.4-3.7-5.9-9.1 6.8-3.5z',
              }),
              svg('path', {
                fill: 'currentColor',
                d: 'M.9.14c-.7.3-1 1-.8 1.8l7.7 28.6c.2.8 1 1.3 1.8 1.1.3-.1.6-.3.9-.6l3.9-5.7 6 7.4c.5.6 1.5.7 2.1.2l5.4-4.4c.6-.5.7-1.5.2-2.1l-6-7.4 6.3-2.7c.8-.3 1.1-1.2.8-2-.1-.3-.4-.6-.7-.8L2.2.14c-.4-.2-.9-.2-1.3 0zm2.9 4.3l20.5 10.4-5.2 2.2c-.8.3-1.1 1.2-.8 2 .1.1.1.3.2.4l6.3 7.8-3.1 2.5-6.3-7.8c-.5-.6-1.5-.7-2.1-.2l-.3.3-3.2 4.6c0-.1-6-22.2-6-22.2z',
              })
            ),
            svg(
              'symbol',
              {
                id: 'hand',
                viewBox: '0 0 100 100',
                width: '30',
                height: '30',
              },
              svg(
                'g',
                {
                  transform: 'translate(100) scale(-1,1)',
                },
                svg('path', {
                  fill: 'white',
                  'fill-rule': 'evenodd',
                  stroke: 'currentColor',
                  'stroke-width': '6',
                  'stroke-linecap': 'round',
                  'stroke-linejoin': 'round',
                  'stroke-miterlimit': '10',
                  d: 'M43.065 92c-10.482 0-19.339-4.042-24.301-11.088C15.101 75.707 13 68.753 13 61.831V56c0-5.214 3.875-8.664 7.522-9.262a7.03 7.03 0 0 1 1.156-.088c.876 0 1.744.13 2.582.256.659.099 1.338.2 1.828.2.063 0 .115-.002.158-.004.101-.14.233-.347.33-.499.136-.214.274-.429.416-.633 1.708-2.445 5.168-3.723 7.704-3.723l.106.001c1.162.016 2.243.368 3.197.679.463.151 1.075.351 1.412.395.199-.16.521-.509.745-.752.214-.233.426-.461.64-.674 1.974-1.966 5.037-2.667 7.246-2.667.462 0 .918.029 1.354.087l.229.034c.881.14 1.679.396 2.375.762V15.923c0-5.026 3.642-7.739 7.068-7.739 3.444 0 6.932 2.609 6.932 7.597V51.5c0 .3.011.715.029 1.206l.054 1.164a36.363 36.363 0 0 1 .903-.982c3.463-3.597 7.166-5.606 11.329-6.151a8.917 8.917 0 0 1 1.159-.077c3.549 0 6.525 2.199 7.408 5.473.853 3.167-.554 6.351-3.583 8.11-4.848 2.819-9.382 8.29-11.763 12.512C65.664 86.062 56.877 92 43.065 92z',
                })
              )
            )
          ),
          svg('path', {
            d: 'M6 50h10l15-15l15 15h148a5 5 90 0 1 5 5v89a5 5 90 0 1-5 5h-188a5 5 90 0 1-5-5v-89a5 5 90 0 1 5-5Z',
            fill: 'var(--bg-color)',
            stroke: 'var(--border-color)',
            'stroke-width': '0.5',
          }),
          svg('rect', {
            x: '5',
            y: '85',
            rx: '5',
            width: '190',
            height: '30',
            fill: 'var(--hover-bg)',
          }),
          svg('use', {
            href: '#cursor',
            x: '25',
            y: '10',
            width: '16',
            color: '#888',
            opacity: '0.2',
          }),
          svg('use', {
            href: '#cursor',
            x: '25',
            y: '32',
            width: '19',
            color: '#888',
            opacity: '0.25',
          }),
          svg('use', {
            href: '#cursor',
            x: '30',
            y: '60',
            width: '23',
            color: '#888',
            opacity: '0.32',
          }),
          svg('use', {
            href: '#hand',
            x: '34',
            y: '95',
            width: '35',
            color: '#888',
          })
        )
      )
    )
  );

  return container;
}
