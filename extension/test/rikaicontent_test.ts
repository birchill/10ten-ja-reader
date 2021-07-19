import { Config } from '../configuration';
import { TestOnlyRcxContent } from '../rikaicontent';
import { expect, use } from '@esm-bundle/chai';
import chrome from 'sinon-chrome';
import simulant from 'simulant';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

use(sinonChai);

let rcxContent = new TestOnlyRcxContent();

describe('RcxContent', () => {
  beforeEach(() => {
    chrome.reset();
    rcxContent = new TestOnlyRcxContent();
    // Default enable rcxContent since no tests care about that now.
    rcxContent.enableTab({ showOnKey: '' } as Config);
  });
  describe('.show', () => {
    describe('when given Japanese word interrupted with text wrapped by `display: none`', () => {
      it('sends "xsearch" message with invisible text omitted', () => {
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

    describe('when given Japanese word interrupted with text wrapped by `visibility: hidden`', () => {
      it('sends "xsearch" message with invisible text omitted', () => {
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

    describe('when given Japanese word is interrupted with text wrapped by visible span', () => {
      it('sends "xsearch" message with all text included', () => {
        const rcxContent = new TestOnlyRcxContent();
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

  describe('mousemove', () => {
    afterEach(() => {
      sinon.restore();
    });

    it('handled without logging errors if `caretRangeFromPoint` returns null', () => {
      sinon
        .stub(document, 'caretRangeFromPoint')
        .returns(null as unknown as Range);
      sinon.spy(console, 'log');

      simulant.fire(document, 'mousemove');

      expect(console.log).to.not.have.been.called;
    });

    it('triggers xsearch message when above Japanese text', async () => {
      const clock = sinon.useFakeTimers();
      const span = insertHtmlIntoDomAndReturnFirstTextNode(
        '<span>先生test</span>'
      ) as HTMLSpanElement;

      simulant.fire(span, 'mousemove', {
        clientX: span.offsetLeft,
        clientY: span.offsetTop,
      });
      // Tick the clock forward to account for the popup delay.
      clock.tick(1);

      expect(chrome.runtime.sendMessage).to.have.been.calledWithMatch({
        type: 'xsearch',
        text: '先生test',
      });
    });
  });
});

function insertHtmlIntoDomAndReturnFirstTextNode(htmlString: string): Node {
  const template = document.createElement('template');
  template.innerHTML = htmlString;
  return document.body.appendChild(template.content.firstChild!);
}

function executeShowForGivenNode(
  rcxContent: TestOnlyRcxContent,
  node: Node
): void {
  rcxContent.show(
    {
      prevRangeNode: rcxContent.getFirstTextChild(node) as Text,
      prevRangeOfs: 0,
      uofs: 0,
    },
    0
  );
}
