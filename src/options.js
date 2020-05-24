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
    if (this.builder) {
      const yargs = require('yargs');
      await this.builder(tln, yargs(_));
      return yargs.argv;
    }
    return {};
  }

}

module.exports.create = (logger) => {
  return new Options(logger);
}