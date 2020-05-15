'use strict';

class Options {
  constructor(logger) {
    this.logger = logger;
    this.descs = [];
  }

  setDescs(descs) {
    if (descs) {
      this.descs = descs;
    }
  }

  parse(argv, inputEnv) {
    let env = {};
    this.descs.forEach( d => {
      if (argv[d.option]) {
        env[d.env] = argv[d.option];
      } else {
        env[d.env] = d.default;
      }
    });
    return { ...inputEnv, ...env};
  }

}

module.exports.create = (logger) => {
  return new Options(logger);
}