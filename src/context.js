'use strict';

class Context {
  constructor(logger) {
    this.logger = logger;
    this.env = JSON.parse(JSON.stringify(process.env));
  }

  getEnv() {
    return this.env;
  }

  updateEnv(vars) {
    for (let [key, value] of Object.entries(vars)) {
      this.env[key] = value;
    }
  }
}

module.exports.create = (logger) => {
  return new Context(logger);
}