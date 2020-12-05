'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');

class Appl {

  /*
  *
  * params:
  */
  constructor(context) {
  }

}

module.exports.create = (context) => {
  return new Appl(context);
}
