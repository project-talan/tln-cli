'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const lsbRelease = require('lsb-release');

const utils = require('./utils');
const filter = require('./filter');

class Appl {

  //
  configure() {
    return new Promise( (resolve, reject) => {
      lsbRelease( (_, data) => {
        let info = (data) ? data : {};
        info.os = os.type();
        info.platform = os.platform();
        info.version = os.release();
        //
        this.logger.trace(utils.prefix(this, 'configure'), 'filter info:', info);
        resolve(filter.create(this.logger, info));
      });
    });
  }

  // function is used during initial components lookup from command line parameter
  // components are colon separated string of ids (paths)
  // every id can be
  // (1) exact component id, like git:        will be looked inside child hierarchy of current component
  // (2) absolute path /java/openjdk-11.0.2:  lookup will start from root component
  // (2) relative path static/html:           the same as (1)
  resolve(components) {
    this.logger.trace(utils.prefix(this, this.resolve.name), utils.quote(components));
    //
    let r = [];
    let ids = [];
    if (components) {
      ids = components.split(':');
    }
    if (ids.length) {
      ids.forEach( (id) => {
        // split id into elements, identify is it absulute path
        this.logger.trace(utils.prefix(this, this.resolve.name), 'resolving ', utils.quote(id));
        // try to find inside child components
        let e = this.component.find(id, true);
        if (!e) {
          // try to use components in parent's child
          this.logger.trace('searching', `'${id}'`, 'using parent');
          e = this.component.find(id, true, this.component);
        }
        if (e) {
          r.push(e);
        } else {
          this.logger.warn('component with id', utils.quote(id), 'was not found');
        }
      } );
    } else {
      // resolve to the current folder component
      r.push(this.component);
    }
    return r;
  }

}

module.exports.create = (logger, home) => {
  return new Appl(logger, home);
}
