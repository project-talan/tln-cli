'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');

const logger = require('./logger');

class Appl {

  /*
  *
  * params:
  */
  constructor(verbose, cwd) {
    this.logger = logger.create(verbose);
    this.cwd = cwd;
    this.logger.info(`cwd: ${this.cwd}`);
  }

  async config(repository, force, quite) {
    this.logger.info(`config: '${repository}' '${force}' '${quite}'`);
  }

}

module.exports.create = (verbose, cwd) => {
  return new Appl(verbose, cwd);
}
