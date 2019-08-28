'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');

class Tln {

  /*
  *
  * params:
  */
  constructor(logger, filter) {
    this.logger = logger;
    this.filter = filter;
  }

  /*
    *
    * params:
    */
  getOsInfo() {
    return {...this.filter.osInfo};
  }

}

module.exports.create = (logger, filter) => {
  return new Tln(logger, filter);
}
