'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');

const entity = require('./entity');

class catalog extends entity {

  /*
  *
  * params:
  */
  constructor(context) {
    super(context);
  }

}

module.exports.create = (context) => {
  return new catalog(context);
}
