(function(){

  Object.defineProperty(window, 'mocha', {
    get: function() { return undefined },
    set: function(m) {
      delete window.mocha;
      window.mocha = m;
      shimMocha(m);
    },
    configurable: true
  });

  function shimMocha(m) {

    const origRun = m.run;
    m.run = function() {
      window.callPhantom({ testRunStarted: m.suite.suites.length });
      m.runner = origRun.apply(mocha, arguments);
      if (m.runner.stats && m.runner.stats.end) {
        window.callPhantom({ testRunEnded: m.runner });
      } else {
        m.runner.on('end', () => {
          window.callPhantom({ testRunEnded: m.runner });
        });
      }
      return m.runner;
    };

    // Force reporter to 'spec'
    const origSetup = m.setup;
    m.setup = function(opts) {
      if (typeof opts === 'string') {
        opts = { ui: opts };
      } else if (typeof opts !== 'object') {
        opts = {};
      }
      return origSetup.call(mocha, Object.assign(opts, { reporter: 'spec' }));
    }
  }

}());
