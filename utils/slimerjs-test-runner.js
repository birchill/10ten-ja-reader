// This code is adapted heavily from mocha-phantomjs-core so that it works with
// slimerjs and is a little more lightweight.

const system = require('system');
const url = system.args[1];

const LOAD_TIMEOUT = 10 * 1000; // 10s

// Since exit() is async, we wrap everything in a function that we can early
// return from.

(function() {

  if (!url) {
    console.log('Usage: slimerjs slimerjs-test-runner.js <url>');
    return slimer.exit(1);
  }

  const page = require('webpage').create();
  let runStarted = false;

  page.onConsoleMessage = msg => console.log(msg);

  page.onError = (msg, traces) => {
    const stack = traces.reduce(
      (stack, trace) => `${stack} `
                        + trace.function ? ` in ${trace.function}` : ''
                        + ` at ${trace.file}:${trace.line}`,
      ''
    );

    console.log(`${msg}\n${stack}`);
    return slimer.exit(1);
  };

  let initialized = false;
  page.onInitialized = function() {
    if (!initialized) {
      initialized = true;
      page.evaluate(function() {
        console.log(`Running tests with UA: ${navigator.userAgent}`);
      });
    }

    page.injectJs('mocha-shim.js');
  };

  page.onCallback = message => {

    if (message && 'testRunStarted' in message) {
      if (message.testRunStarted === 0) {
        console.log('Error: mocha.run() was called with no tests');
        return slimer.exit(1);
      }
      runStarted = true;
    }

    if (message && message.testRunEnded) {
      console.log(`Finished with ${message.testRunEnded.failures} failures.`);
      page.close();
      slimer.exit(message.testRunEnded.failures);
    }
  };

  page.open(url)
      .then(status => {
        if (status !== 'success') {
          console.log('Error: the page could not be loaded');
          page.close();
          slimer.exit(1);
        }

        var loadTimeout = config.loadTimeout || 10000
        setTimeout(function() {
          if (!runStarted) {
            console.log('Error: tests have not started running within'
                        + `${LOAD_TIMEOUT / 1000}s`);
            page.close();
            slimer.exit(1);
          }
        }, LOAD_TIMEOUT)
      });
}());
