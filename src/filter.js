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
    this.isWsl = require('is-wsl');
    this.isDocker = require('is-docker');
    this.filter = '';
  }

  //
  validate(pattern) {
    if (pattern) {
      return (this.filter.match(pattern) !== null);
    }
    return true;
  }

  isWindows() {
    return os.platform() === 'win32';
  }

  isLinux() {
    return os.platform() === 'linux';
  }

  isDarwin() {
    return os.platform() === 'darwin';
  }

  getOsInfo() {
    return this.osInfo;
  }

  async configure() {
    return new Promise( (resolve, reject) => {
      getos((e,info) => {
        if(e) {
          this.logger.error(e);
        } else {
          this.osInfo = {...this.osInfo, ...info};
          let data = [];
          Object.keys(this.osInfo).forEach( k => {
            data.push(this.osInfo[k]);
          });
          if (this.isWsl) {
            data.push('wsl');
          }
          if (this.isDocker) {
            data.push('docker');
          }
          this.filter = utils.uniquea(data.map( v => v.toLowerCase())).join(';');
          //console.log(this.osInfo, this.filter);
        }
        resolve();
      });
    });
  }
}

module.exports.create = (logger) => {
  return new Filter(logger);
}
