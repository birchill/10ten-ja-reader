import { Config } from '../configuration';
import { RcxMain } from '../rikaichan';
import { expect, use } from '@esm-bundle/chai';
import chrome from 'sinon-chrome';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

use(sinonChai);

let rcxMain: RcxMain;

describe('background.ts', function () {
  before(async function () {
    // Resolve config fetch with minimal config object.
    chrome.storage.sync.get.yields({ kanjiInfo: [] });
    // Imports only run once so run in `before` to make it deterministic.
    rcxMain = await (await import('../background')).TestOnlyRxcMainPromise;
  });

  beforeEach(function () {
    // Only reset the spies we're using since we need to preserve
    // the state of `chrome.runtime.onMessage.addListener` for invoking
    // the core functionality of background.ts.
    chrome.tabs.sendMessage.reset();
  });

  describe('when sent enable? message', function () {
    it('should send "enable" message to tab', async function () {
      rcxMain.enabled = 1;

      await sendMessageToBackground({ type: 'enable?' });

      expect(chrome.tabs.sendMessage).to.have.been.calledWithMatch(
        /* tabId= */ sinon.match.any,
        {
          type: 'enable',
        }
      );
    });

    it('should respond to the same tab it received a message from', async function () {
      rcxMain.enabled = 1;
      const tabId = 10;

      await sendMessageToBackground({ tabId: tabId, type: 'enable?' });

      expect(chrome.tabs.sendMessage).to.have.been.calledWithMatch(
        tabId,
        /* message= */ sinon.match.any
      );
    });

    it('should send config in message to tab', async function () {
      rcxMain.enabled = 1;
      rcxMain.config = { copySeparator: 'testValue' } as Config;

      await sendMessageToBackground({ type: 'enable?' });

      expect(chrome.tabs.sendMessage).to.have.been.calledWithMatch(
        /* tabId= */ sinon.match.any,
        { config: rcxMain.config }
      );
    });
  });
});

async function sendMessageToBackground({
  tabId = 0,
  type,
  responseCallback = () => {
    // Do nothing by default.
  },
}: {
  tabId?: number;
  type: string;
  responseCallback?: (response: unknown) => void;
}): Promise<void> {
  // In background.ts, a promise is passed to `addListener` so we can await it here.
  // eslint-disable-next-line @typescript-eslint/await-thenable
  await chrome.runtime.onMessage.addListener.yield(
    { type: type },
    { tab: { id: tabId } },
    responseCallback
  );
  return;
}
