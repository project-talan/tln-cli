'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');

class Appl {

  constructor(presetsHome, verbose) {
    this.presetsHome = presetsHome;
    this.logger = null;
    this.rootComponent = null;
    this.currentComponent = null;
  }

}

module.exports.create = (presetsHome, verbose) => {
  return new Appl(presetsHome, verbose);
}
