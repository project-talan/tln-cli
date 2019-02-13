'use strict';

class Context {
  constructor(logger) {
    this.logger = logger;
  }
}

module.exports = create(logger) {
  return new Context(logger);
}