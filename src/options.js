'use strict';

class Options {
  constructor(logger) {
    this.logger = logger;
    this.desc = [];
  }

  add(id, variable, description, def) {
    this.desc.push({id: id, variable: variable, description: description, default: def});
    return this;
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

module.exports.create = (logger) => {
  return new Options(logger);
}