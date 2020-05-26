'use strict';

class Options {
  constructor(logger) {
    this.logger = logger;
    this.builder = null;
  }

  setBuilder(builder) {
    this.builder = builder;
  }

  async parse(tln, _) {
    const env = {};
    if (this.builder) {
      let envPrefix = null;
      const yargs = require('yargs')(_);
      const args = Object.freeze({
        prefix: (p) => { envPrefix = p; return args; },
        option: (n, o) => { yargs.option(n, o); return args; }
      });
      //
      await this.builder(tln, args);
      if (envPrefix) {
        const argv = { ...yargs.argv };
        delete argv['$0'];
        delete argv['_'];
        //
        for (const key of Object.keys(argv)) {
          env[[envPrefix, key].join('_').toUpperCase()] = argv[key];
        }
      }
    }
    return env;
  }

}

module.exports.create = (logger) => {
  return new Options(logger);
}