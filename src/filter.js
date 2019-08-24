'use strict';

const os = require('os');
const getos = require('getos');
const utils = require('./utils');

class Filter {
  constructor(logger) {
    this.logger = logger;
    this.data = [os.type(), os.platform(), os.release()];
  }

  //
  validate(pattern) {
    return (this.filter.match(pattern) !== null);
  }

  configure() {
    return new Promise( (resolve, reject) => {
      getos((e,os) => {
        if(e) {
          this.logger.error(e);
        } else {
          Object.keys(os).forEach( k => {
            this.data.push(os[k]);
          });
          this.filter = utils.uniquea(this.data.map( v => v.toLowerCase())).join(';');
        }
        resolve();
      });
    });
  }

}

module.exports.create = (logger) => {
  return new Filter(logger);
}
