'use strict';

class Context {
  constructor(logger) {
    this.logger = logger;
    this.env = {};
    this.script = null;
  }

  getEnv() {
    return this.env;
  }

  updateEnv(vars) {
    for (let [key, value] of Object.entries(vars)) {
      this.env[key] = value;
    }
  }

  setScript(script) {
    this.script = script;
  }

  getScript(script) {
    return this.script;
  }
}

module.exports.create = (logger) => {
  return new Context(logger);
}