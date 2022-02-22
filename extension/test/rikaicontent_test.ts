import { Config } from '../configuration';
import { DictEntryData } from '../data';
import { TestOnlyRcxContent } from '../rikaicontent';
import { expect, use } from '@esm-bundle/chai';
import { html, render } from 'lit-html';
import chrome from 'sinon-chrome';
import simulant from 'simulant';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

use(sinonChai);

let rcxContent = new TestOnlyRcxContent();
let root = document.createElement('div');

// Reset chrome to clear any API calls that happened during importing.
chrome.reset();

describe('RcxContent', function () {
  beforeEach(function () {
    root = createAndAppendRoot();
    initializeRcxContent();
  });

  afterEach(function () {
    chrome.reset();
    sinon.restore();
    rcxContent.disableTab();
    root.remove();
  });

  describe('.show', function () {
    describe('when given Japanese word interrupted with text wrapped by `display: none`', function () {
      it('sends "xsearch" message with invisible text omitted', function () {
        const span = insertHtmlIntoDomAndReturnFirstTextNode(
          '<span>試<span style="display:none">test</span>す</span>'
        );

        executeShowForGivenNode(rcxContent, span);

        expect(chrome.runtime.sendMessage).to.have.been.calledWithMatch(
          { type: 'xsearch', text: '試す' },
          sinon.match.any
        );
      });
    });

    describe('when given Japanese word interrupted with text wrapped by `visibility: hidden`', function () {
      it('sends "xsearch" message with invisible text omitted', function () {
        const span = insertHtmlIntoDomAndReturnFirstTextNode(
          '<span>試<span style="visibility: hidden">test</span>す</span>'
        );

        executeShowForGivenNode(rcxContent, span);

        expect(chrome.runtime.sendMessage).to.have.been.calledWithMatch(
          { type: 'xsearch', text: '試す' },
          sinon.match.any
        );
      });
    });

    describe('when given Japanese word is interrupted with text wrapped by visible span', function () {
      it('sends "xsearch" message with all text included', function () {
        const span = insertHtmlIntoDomAndReturnFirstTextNode(
          '<span>試<span>test</span>す</span>'
        );

        executeShowForGivenNode(rcxContent, span);

        expect(chrome.runtime.sendMessage).to.have.been.calledWithMatch(
          { type: 'xsearch', text: '試testす' },
          sinon.match.any
        );
      });
    });
  });

  describe('mousemove', function () {
    afterEach(function () {
      sinon.restore();
    });

    it('handled without logging errors if `caretRangeFromPoint` returns null', function () {
      sinon
        .stub(document, 'caretRangeFromPoint')
        .returns(null as unknown as Range);
      sinon.spy(console, 'log');

      simulant.fire(document, 'mousemove');

      expect(console.log).to.not.have.been.called;
    });

    it('triggers xsearch message when above Japanese text', function () {
      const clock = sinon.useFakeTimers();
      const span = insertHtmlIntoDomAndReturnFirstTextNode(
        '<span>先生test</span>'
      ) as HTMLSpanElement;

      triggerMousemoveAtElementStart(span);
      // Tick the clock forward to account for the popup delay.
      clock.tick(1);

      expect(chrome.runtime.sendMessage).to.have.been.calledWithMatch({
        type: 'xsearch',
        text: '先生test',
      });
    });

    describe('inside text area', function () {
      it('triggers xsearch message when above Japanese text', function () {
        const clock = sinon.useFakeTimers();
        const textarea = insertHtmlIntoDomAndReturnFirstTextNode(
          '<textarea>生test</textarea>'
        ) as HTMLTextAreaElement;

        triggerMousemoveAtElementStart(textarea);
        // Tick the clock forward to account for the popup delay.
        clock.tick(1);

        expect(chrome.runtime.sendMessage).to.have.been.calledWithMatch({
          type: 'xsearch',
          text: '生test',
        });
      });
    });

    describe('with Google Docs annotated canvas', function () {
      beforeEach(function () {
        markDocumentWithGoogleDocsClass();
        // Reinitialize rcxContent now that special class is rendered.
        initializeRcxContent();
      });

      it('does not trigger xsearch when over svg but not rect', function () {
        const clock = sinon.useFakeTimers();
        render(
          html`<svg style="position:absolute">
            <g>
              <rect
                x="0"
                y="-0.32283854166666615"
                width="29.319976806640625"
                height="17.599999999999998"
                aria-label="あれ"
                fill="none"
                data-font-css='400 14.6667px "Arial"'
              ></rect>
            </g>
          </svg>`,
          root
        );

        triggerMousemoveAtElementCenter(root.querySelector('svg')!);
        // Tick the clock forward to account for the popup delay.
        clock.tick(1);

        expect(chrome.runtime.sendMessage).to.not.have.been.called;
      });

      it('does not trigger xsearch when too far left of <g>', function () {
        const clock = sinon.useFakeTimers();
        render(
          html`<svg style="position:absolute">
            <g>
              <rect
                x="0"
                y="-0.32283854166666615"
                width="29.319976806640625"
                height="17.599999999999998"
                aria-label="あれ"
                fill="none"
                data-font-css='400 14.6667px "Arial"'
              ></rect>
            </g>
          </svg>`,
          root
        );
        const rect = root.querySelector('rect')!;

        simulant.fire(rect, 'mousemove', {
          clientX: Math.ceil(rect.getBoundingClientRect().left - 1),
          clientY: Math.ceil(rect.getBoundingClientRect().top),
        });
        // Tick the clock forward to account for the popup delay.
        clock.tick(1);

        expect(chrome.runtime.sendMessage).to.not.have.been.called;
      });

      it('does not trigger xsearch when too far right of <g>', function () {
        const clock = sinon.useFakeTimers();
        render(
          html`<svg style="position:absolute">
            <g>
              <rect
                x="0"
                y="-0.32283854166666615"
                width="29.319976806640625"
                height="17.599999999999998"
                aria-label="あれ"
                fill="none"
                data-font-css='400 14.6667px "Arial"'
              ></rect>
            </g>
          </svg>`,
          root
        );
        const rect = root.querySelector('rect')!;

        simulant.fire(rect, 'mousemove', {
          clientX: Math.ceil(rect.getBoundingClientRect().left + 30),
          clientY: Math.ceil(rect.getBoundingClientRect().top),
        });
        // Tick the clock forward to account for the popup delay.
        clock.tick(1);

        expect(chrome.runtime.sendMessage).to.not.have.been.called;
      });

      it('does not trigger xsearch when too far up of <g>', function () {
        const clock = sinon.useFakeTimers();
        render(
          html`<svg style="position:absolute">
            <g>
              <rect
                x="0"
                y="-0.32283854166666615"
                width="29.319976806640625"
                height="17.599999999999998"
                aria-label="あれ"
                fill="none"
                data-font-css='400 14.6667px "Arial"'
              ></rect>
            </g>
          </svg>`,
          root
        );
        const rect = root.querySelector('rect')!;

        simulant.fire(rect, 'mousemove', {
          clientX: Math.ceil(rect.getBoundingClientRect().left),
          clientY: Math.ceil(rect.getBoundingClientRect().top - 1),
        });
        // Tick the clock forward to account for the popup delay.
        clock.tick(1);

        expect(chrome.runtime.sendMessage).to.not.have.been.called;
      });

      it('does not trigger xsearch when too far down of <g>', function () {
        const clock = sinon.useFakeTimers();
        render(
          html`<svg style="position:absolute">
            <g>
              <rect
                x="0"
                y="-0.32283854166666615"
                width="29.319976806640625"
                height="17.599999999999998"
                aria-label="あれ"
                fill="none"
                data-font-css='400 14.6667px "Arial"'
              ></rect>
            </g>
          </svg>`,
          root
        );
        const rect = root.querySelector('rect')!;

        simulant.fire(rect, 'mousemove', {
          clientX: Math.ceil(rect.getBoundingClientRect().left),
          clientY: Math.ceil(rect.getBoundingClientRect().top + 18),
        });
        // Tick the clock forward to account for the popup delay.
        clock.tick(1);

        expect(chrome.runtime.sendMessage).to.not.have.been.called;
      });

      describe('with mouse event inside <g>', function () {
        // The <rect> x/y values have been adjusted to leave room for the
        // mouse to be outside all rects while still in the <g> element.

        it('does not trigger xsearch when too far left of <rect>', function () {
          const clock = sinon.useFakeTimers();
          render(
            html`<svg style="position:absolute">
              <g>
                <rect
                  x="0"
                  y="-0.32283854166666615"
                  width="14.659988403320312"
                  height="17.599999999999998"
                  fill="none"
                  aria-label="開"
                  data-font-css='400 14.6667px "Arial"'
                ></rect>
                <rect
                  id="startrect"
                  x="17.659988403320312"
                  y="-0.32283854166666615"
                  width="14.659988403320312"
                  height="17.599999999999998"
                  fill="none"
                  aria-label="始"
                  data-font-css='700 14.6667px "Arial"'
                ></rect>
              </g>
            </svg>`,
            root
          );
          const rect = root.querySelector('rect#startrect')!;

          simulant.fire(rect, 'mousemove', {
            clientX: Math.ceil(rect.getBoundingClientRect().left - 1),
            clientY: Math.ceil(rect.getBoundingClientRect().top),
          });
          // Tick the clock forward to account for the popup delay.
          clock.tick(1);

          expect(chrome.runtime.sendMessage).to.not.have.been.called;
        });

        it('does not trigger xsearch when too far right of <rect>', function () {
          const clock = sinon.useFakeTimers();
          render(
            html`<svg style="position:absolute">
              <g>
                <rect
                  id="startrect"
                  x="0"
                  y="-0.32283854166666615"
                  width="14.659988403320312"
                  height="17.599999999999998"
                  fill="none"
                  aria-label="開"
                  data-font-css='400 14.6667px "Arial"'
                ></rect>
                <rect
                  x="19.659988403320312"
                  y="-0.32283854166666615"
                  width="14.659988403320312"
                  height="17.599999999999998"
                  fill="none"
                  aria-label="始"
                  data-font-css='700 14.6667px "Arial"'
                ></rect>
              </g>
            </svg>`,
            root
          );
          const rect = root.querySelector('rect#startrect')!;

          simulant.fire(rect, 'mousemove', {
            clientX: Math.ceil(rect.getBoundingClientRect().left + 18),
            clientY: Math.ceil(rect.getBoundingClientRect().top),
          });
          // Tick the clock forward to account for the popup delay.
          clock.tick(1);

          expect(chrome.runtime.sendMessage).to.not.have.been.called;
        });

        it('does not trigger xsearch when too far up of <rect>', function () {
          const clock = sinon.useFakeTimers();
          render(
            html`<svg style="position:absolute">
              <g>
                <rect
                  x="0"
                  y="-0.32283854166666615"
                  width="14.659988403320312"
                  height="17.599999999999998"
                  fill="none"
                  aria-label="開"
                  data-font-css='400 14.6667px "Arial"'
                ></rect>
                <rect
                  id="startrect"
                  x="14.659988403320312"
                  y="20"
                  width="14.659988403320312"
                  height="17.599999999999998"
                  fill="none"
                  aria-label="始"
                  data-font-css='700 14.6667px "Arial"'
                ></rect>
              </g>
            </svg>`,
            root
          );
          const rect = root.querySelector('rect#startrect')!;

          simulant.fire(rect, 'mousemove', {
            clientX: Math.ceil(rect.getBoundingClientRect().left),
            clientY: Math.ceil(rect.getBoundingClientRect().top - 1),
          });
          // Tick the clock forward to account for the popup delay.
          clock.tick(1);

          expect(chrome.runtime.sendMessage).to.not.have.been.called;
        });

        it('does not trigger xsearch when too far down of <rect>', function () {
          const clock = sinon.useFakeTimers();
          render(
            html`<svg style="position:absolute">
              <g>
                <rect
                  id="startrect"
                  x="0"
                  y="-0.32283854166666615"
                  width="14.659988403320312"
                  height="17.599999999999998"
                  fill="none"
                  aria-label="開"
                  data-font-css='400 14.6667px "Arial"'
                ></rect>
                <rect
                  x="14.659988403320312"
                  y="20"
                  width="14.659988403320312"
                  height="17.599999999999998"
                  fill="none"
                  aria-label="始"
                  data-font-css='700 14.6667px "Arial"'
                ></rect>
              </g>
            </svg>`,
            root
          );
          const rect = root.querySelector('rect#startrect')!;

          simulant.fire(rect, 'mousemove', {
            clientX: Math.ceil(rect.getBoundingClientRect().left),
            clientY: Math.ceil(rect.getBoundingClientRect().top + 18),
          });
          // Tick the clock forward to account for the popup delay.
          clock.tick(1);

          expect(chrome.runtime.sendMessage).to.not.have.been.called;
        });
      });

      it('triggers xsearch message with svg target', function () {
        const clock = sinon.useFakeTimers();
        render(
          html`<svg style="position:absolute">
            <g>
              <rect
                x="0"
                y="-0.32283854166666615"
                width="29.319976806640625"
                height="17.599999999999998"
                aria-label="あれ"
                fill="none"
                data-font-css='400 14.6667px "Arial"'
              ></rect>
            </g>
          </svg>`,
          root
        );

        triggerMousemoveAtElementStart(root.querySelector('svg')!);
        // Tick the clock forward to account for the popup delay.
        clock.tick(1);

        expect(chrome.runtime.sendMessage).to.have.been.calledWithMatch({
          type: 'xsearch',
          text: 'あれ',
        });
      });

      it('triggers xsearch message with highlighted text target', function () {
        const clock = sinon.useFakeTimers();
        render(
          html`<svg style="position:absolute">
              <g>
                <rect
                  x="0"
                  y="-0.32283854166666615"
                  width="29.319976806640625"
                  height="17.599999999999998"
                  aria-label="あれる"
                  fill="none"
                  data-font-css='400 14.6667px "Arial"'
                  style="position:absolute"
                ></rect>
              </g>
            </svg>
            <!-- DOM representing highlight -->
            <svg width="100%" height="100%" style="position:absolute">
              <rect
                id="hlrect"
                x="0"
                y="0"
                width="29.319976806640625"
                height="19.39501953125"
                fill="rgba(0,0,0,0.15)"
              ></rect>
            </svg>`,
          root
        );

        triggerMousemoveAtElementStart(root.querySelector('rect#hlrect')!);
        // Tick the clock forward to account for the popup delay.
        clock.tick(1);

        expect(chrome.runtime.sendMessage).to.have.been.calledWithMatch({
          type: 'xsearch',
          text: 'あれる',
        });
      });

      it('triggers xsearch message including formatted text', function () {
        const clock = sinon.useFakeTimers();
        render(
          html`<svg style="position:absolute">
            <g>
              <rect
                id="startrect"
                x="0"
                y="-0.32283854166666615"
                width="14.659988403320312"
                height="17.599999999999998"
                fill="none"
                aria-label="開"
                data-font-css='400 14.6667px "Arial"'
              ></rect>
              <rect
                x="14.659988403320312"
                y="-0.32283854166666615"
                width="14.659988403320312"
                height="17.599999999999998"
                fill="none"
                aria-label="始"
                data-font-css='700 14.6667px "Arial"'
              ></rect>
            </g>
          </svg>`,
          root
        );

        triggerMousemoveAtElementStart(root.querySelector('rect#startrect')!);
        // Tick the clock forward to account for the popup delay.
        clock.tick(1);

        expect(chrome.runtime.sendMessage).to.have.been.calledWithMatch({
          type: 'xsearch',
          text: '開始',
        });
      });

      it('triggers xsearch message including linebreak', function () {
        const clock = sinon.useFakeTimers();
        render(
          html`<svg style="position:absolute">
            <g>
              <rect
                id="startrect"
                x="0"
                y="-0.32283854166666615"
                width="14.659988403320312"
                height="17.599999999999998"
                fill="none"
                aria-label="準"
                data-font-css='400 14.6667px "Arial"'
              ></rect>
            </g>
            <g>
              <rect
                x="0"
                y="-0.32283854166666615"
                width="29.319976806640625"
                height="17.599999999999998"
                fill="none"
                aria-label="備を"
                data-font-css='400 14.6667px "Arial"'
              ></rect>
            </g>
          </svg>`,
          root
        );

        triggerMousemoveAtElementStart(root.querySelector('rect#startrect')!);
        // Tick the clock forward to account for the popup delay.
        clock.tick(1);

        expect(chrome.runtime.sendMessage).to.have.been.calledWithMatch({
          type: 'xsearch',
          text: '準備を',
        });
      });

      it('triggers xsearch message ignoring content in non <rect> tags', function () {
        const clock = sinon.useFakeTimers();
        render(
          html`<svg style="position:absolute">
            <g>
              <rect
                id="startrect"
                x="0"
                y="-0.32283854166666615"
                width="14.659988403320312"
                height="17.599999999999998"
                fill="none"
                aria-label="準"
                data-font-css='400 14.6667px "Arial"'
              ></rect>
            </g>
            <g>
              <text
                x="0"
                y="-0.32283854166666615"
                width="29.319976806640625"
                height="17.599999999999998"
                fill="none"
                aria-label="備を"
                data-font-css='400 14.6667px "Arial"'
              >
                備を
              </text>
            </g>
          </svg>`,
          root
        );

        triggerMousemoveAtElementStart(root.querySelector('rect#startrect')!);
        // Tick the clock forward to account for the popup delay.
        clock.tick(1);

        expect(chrome.runtime.sendMessage).to.have.been.calledWithMatch({
          type: 'xsearch',
          text: '準',
        });
      });
    });
  });

  describe('processEntry', function () {
    describe('when highlight config option enabled', function () {
      it('does not try to highlight text in Google Docs', function () {
        markDocumentWithGoogleDocsClass();
        initializeRcxContent({ highlight: true });
        seedRcxContentWithGoogleDocsMouseMove();
        sinon.spy(window, 'getSelection');

        rcxContent.processEntry({} as DictEntryData);

        expect(window.getSelection).to.not.have.been.called;
      });

      it('highlights normal text', function () {
        initializeRcxContent({ highlight: true });
        seedRcxContentWithNormalMouseMove();
        const addRangeSpy = sinon.spy(window.getSelection()!, 'addRange');

        rcxContent.processEntry({} as DictEntryData);

        expect(addRangeSpy).to.have.been.called.calledOnce;
      });
    });
  });

  describe('showPopup', function () {
    it('sets data-theme attribute of rikaikun window to config popupcolor value', function () {
      rcxContent.enableTab({ popupcolor: 'redtest' } as Config);

      rcxContent.showPopup('<span></span>');

      // expect rikaikun window to have data-theme attribute set to config popupcolor value
      expect(
        document.querySelector<HTMLDivElement>('#rikaichan-window')!.dataset
          .theme
      ).to.equal('redtest');
    });

    it('adds link tag pointing to "css/popup.css" to <head>', function () {
      chrome.extension.getURL.callsFake((path: string) => {
        return `http://fakebaseurl/${path}`;
      });

      rcxContent.showPopup('<span></span>');

      expect(
        document.querySelector<HTMLLinkElement>('head link')!.href
      ).to.equal('http://fakebaseurl/css/popup.css');
    });
  });
});

// Required if testing downstream methods which expect a proper hover event to have
// already been processed.
function seedRcxContentWithNormalMouseMove() {
  const clock = sinon.useFakeTimers();
  const span = insertHtmlIntoDomAndReturnFirstTextNode(
    '<span>試す</span>'
  ) as HTMLSpanElement;
  triggerMousemoveAtElementStart(span);
  // Tick the clock forward to account for the popup delay.
  clock.tick(1);
}
function seedRcxContentWithGoogleDocsMouseMove() {
  const clock = sinon.useFakeTimers();
  render(
    html`<svg>
      <g>
        <rect
          x="0"
          y="-0.32283854166666615"
          width="29.319976806640625"
          height="17.599999999999998"
          aria-label="あれ"
          fill="none"
          data-font-css='400 14.6667px "Arial"'
        ></rect>
      </g>
    </svg>`,
    root
  );
  triggerMousemoveAtElementStart(root.querySelector('rect')!);
  // Tick the clock forward to account for the popup delay.
  clock.tick(1);
}

function markDocumentWithGoogleDocsClass() {
  render(html`<div class="kix-canvas-tile-content"></div>`, root);
}

function initializeRcxContent(config = {} as Partial<Config>) {
  // Disable first in case a test is calling this to override default behavior.
  rcxContent.disableTab();
  rcxContent = new TestOnlyRcxContent();
  // showOnKey required for most tests to work.
  rcxContent.enableTab({ showOnKey: '', ...config } as Config);
}

function triggerMousemoveAtElementStart(element: Element) {
  simulant.fire(element, 'mousemove', {
    clientX: Math.ceil(element.getBoundingClientRect().left),
    clientY: Math.ceil(element.getBoundingClientRect().top),
  });
}

function triggerMousemoveAtElementCenter(element: Element) {
  simulant.fire(element, 'mousemove', {
    clientX: Math.ceil(
      element.getBoundingClientRect().left +
        element.getBoundingClientRect().width / 2
    ),
    clientY: Math.ceil(
      element.getBoundingClientRect().top +
        element.getBoundingClientRect().height / 2
    ),
  });
}

function insertHtmlIntoDomAndReturnFirstTextNode(htmlString: string): Node {
  const template = document.createElement('template');
  template.innerHTML = htmlString;
  return root.appendChild(template.content.firstChild!);
}

function executeShowForGivenNode(
  rcxContent: TestOnlyRcxContent,
  node: Node
): void {
  rcxContent.show(
    {
      // config is a required property but not needed for testing.
      config: {} as Config,
      prevRangeNode: rcxContent.getFirstTextChild(node) as Text,
      prevRangeOfs: 0,
      uofs: 0,
    },
    0
  );
}

function createAndAppendRoot(): HTMLDivElement {
  const existingRoot = document.querySelector('#root');
  if (existingRoot) {
    existingRoot.remove();
  }
  const root = document.createElement('div');
  root.setAttribute('id', 'root');
  root.style.position = 'relative';
  document.body.appendChild(root);
  return root;
}
