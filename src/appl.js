'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');

const utils = require('./utils');

class Appl {

  constructor(presetsHome, verbose) {
    this.presetsHome = presetsHome;
    this.logger = null;
    this.home = home;
    this.rootComponent = null;
    this.currentComponent = null;
  }

}

module.exports.create = (logger, home) => {
  return new Appl(logger, home);
}
