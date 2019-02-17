'use strict';

class Options {
  constructor(logger, desc) {
    this.logger = logger;
    this.desc = desc;
  }

  parse(argv) {
    let env = {};
    this.desc.forEach( d => {
      if (argv[d.id]) {
        env[d.variable] = argv[d.id];
      } else {
        if (d.default) {
          env[d.variable] = d.default;
        }
      }
    });
    return env;
  }

}

module.exports.create = (logger, desc = []) => {
  return new Options(logger, desc);
}