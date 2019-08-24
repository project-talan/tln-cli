'use strict';

const path = require('path');
const fs = require('fs');
const lsbRelease = require('lsb-release');

const utils = require('./utils');
const filter = require('./filter');

class Appl {

  //


}

module.exports.create = (logger, home) => {
  return new Appl(logger, home);
}
