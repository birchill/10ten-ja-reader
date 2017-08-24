// This code is adapted heavily from mocha-phantomjs-core so that it works with
// slimerjs and is a little more lightweight.

const system = require('system');
const url = system.args[1];

// Since exit() is async, we wrap everything in a function that we can early
// return from.

(function() {

  if (!url) {
    console.log('Usage: slimerjs slimerjs-test-runner.js <url>');
    return slimer.exit(255);
  }

  const page = require('webpage').create();
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

  page.open(url)
      .then(function(status){
          if (status === 'success') {
              console.log(`The title of the page is, '${page.title}'`);
          }
          else {
              console.log('Sorry, the page could not be loaded');
          }
          page.close();
          slimer.exit();
      });
}());
