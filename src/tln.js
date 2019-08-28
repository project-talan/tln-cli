'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');

class Tln {

  /*
  *
  * params:
  */
  constructor(logger) {
    this.logger = logger;
  }

}

module.exports.create = (logger) => {
  return new Tln(logger);
}
