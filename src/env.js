'use strict';

class Env {
  constructor(logger) {
    this.logger = logger;
    this.builder = null;
  }

  setBuilder(builder) {
    this.builder = builder;
  }

  async build(tln, inputEnv) {
    if (this.builder) {
      const env = await this.builder(tln, inputEnv);
      if (env) {
        return {...env};
      }
    }
    return {...inputEnv};
  }

  static BoolNot(l, r) {
  }

}

module.exports.create = (logger) => {
  return new Env(logger);
}