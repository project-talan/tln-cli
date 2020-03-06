'use strict';

const os = require('os');
const getos = require('getos');
const utils = require('./utils');

class Filter {
  constructor(logger) {
    this.logger = logger;
    this.osInfo = {
      type: os.type(),
      platform: os.platform(),
      kernel: os.release()
    };
  }

  //
  validate(pattern) {
    if (pattern) {
      return (this.filter.match(pattern) !== null);
    }
    return true;
  }

  configure() {
    return new Promise( (resolve, reject) => {
      getos((e,os) => {
        if(e) {
          this.logger.error(e);
        } else {
          this.osInfo = {...this.osInfo, ...os};
          let data = [];
          Object.keys(this.osInfo).forEach( k => {
            data.push(this.osInfo[k]);
          });
          this.filter = utils.uniquea(data.map( v => v.toLowerCase())).join(';');
        }
        resolve();
      });
    });
  }

}

module.exports.create = (logger) => {
  return new Filter(logger);
}
