(function(){

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
  }

  Object.defineProperty(window, 'mocha', {
    get: function() { return undefined },
    set: function(m) {
      shimMocha(m);
      delete window.mocha;
      window.mocha = m;
    },
    configurable: true
  });

}());
