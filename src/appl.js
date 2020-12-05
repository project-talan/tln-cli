'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');

const entity = require('./entity');

class appl extends entity {

  /*
  *
  * params:
  */
  constructor(context) {
    super(context);
    this.logger.con(os.homedir());
  }

}

module.exports.create = (context) => {
  return new appl(context);
}
