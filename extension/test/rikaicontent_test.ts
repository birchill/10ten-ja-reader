import { TestOnlyRcxContent } from '../rikaicontent';
import { expect, use } from '@esm-bundle/chai';
import chrome from 'sinon-chrome';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

use(sinonChai);

describe('RcxContent.show', () => {
  beforeEach(() => {
    chrome.reset();
  });

  describe('when given Japanese word interrupted with text wrapped by `display: none`', () => {
    it('sends "xsearch" message with invisible text omitted', () => {
      const rcxContent = new TestOnlyRcxContent();
      const span = insertHtmlIntoDomAndReturnFirstTextNode(
        '<span>試<span style="display:none">test</span>す</span>'
      );

      executeShowForGivenNode(rcxContent, span);

      expect(chrome.runtime.sendMessage).to.have.been.calledWith(
        sinon.match({ type: 'xsearch', text: '試す' }),
        sinon.match.any
      );
    });
  });

  describe('when given Japanese word interrupted with text wrapped by `visibility: hidden`', () => {
    it('sends "xsearch" message with invisible text omitted', () => {
      const rcxContent = new TestOnlyRcxContent();
      const span = insertHtmlIntoDomAndReturnFirstTextNode(
        '<span>試<span style="visibility: hidden">test</span>す</span>'
      );

      executeShowForGivenNode(rcxContent, span);

      expect(chrome.runtime.sendMessage).to.have.been.calledWith(
        sinon.match({ type: 'xsearch', text: '試す' }),
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

      expect(chrome.runtime.sendMessage).to.have.been.calledWith(
        sinon.match({ type: 'xsearch', text: '試testす' }),
        sinon.match.any
      );
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
