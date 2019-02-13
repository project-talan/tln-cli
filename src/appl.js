'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const lsbRelease = require('lsb-release');

const utils = require('./utils');
const filter = require('./filter');

class Appl {
  constructor(logger, home) {
    this.logger = logger;
    this.home = home;
    this.root = null;
    this.component = null;
    //
    let cwd = process.cwd();
    // find local dev env projects root
    let projectsHome = process.env.PROJECTS_HOME;
    if (!projectsHome) {
      // otherwise use current folder as root
      projectsHome = cwd;
    }
    // build chain of components from projects home to the current folder
    let folders = [];
    if (cwd.startsWith(projectsHome)) {
      const rel = path.relative(projectsHome, cwd);
      if (rel) {
        folders = rel.split(path.sep);
      }
    } else {
      // running tln outside the projects home - use cwd
      projectsHome = cwd;
    }
    this.logger.info(utils.prefix(this, 'constructor'), 'operating system', utils.quote(os.type()), utils.quote(os.platform()), utils.quote(os.release()));
    this.logger.info(utils.prefix(this, 'constructor'), 'projects home:', projectsHome);
    this.logger.info(utils.prefix(this, 'constructor'), 'cwd:', cwd);
    this.logger.info(utils.prefix(this, 'constructor'), 'folders:', folders);
    //
    this.root = require('./component').createRoot(projectsHome, '/', this.logger);
    this.logger.trace('catalog folder', this.home);
    this.root.loadDescsFromFolder(this.home, 'presets');
    this.root.loadDescs();
    //
    this.component = this.root;
    folders.forEach(function(folder) {
      this.component = this.component.dive(folder, true);
    }.bind(this));
    //
    this.logger.trace(utils.prefix(this, 'constructor'), 'root component:', utils.quote(this.root.getId()), this.root.descs);
    this.logger.trace(utils.prefix(this, 'constructor'), 'current component:', utils.quote(this.component.getId()), this.component.descs);
  }

  //
  configure() {
    return new Promise(function(resolve, reject){
      lsbRelease(function (_, data) {
        data.os = os.type();
        data.platform = os.platform();
        data.version = os.release();
        //
        this.logger.trace(utils.prefix(this, 'configure'), 'filter string:', data);
        resolve(filter.create(this.logger, data));
      }.bind(this));
    }.bind(this));
  }

  // components are colon separated string of ids (paths)
  // every id can be
  // * exact component id, like git
  // * absolute path /java/openjdk-11.0.2
  // * relative path static/html
  resolve(components) {
    this.logger.trace(utils.prefix(this, this.resolve.name), utils.quote(components));
    //
    let r = [];
    let ids = [];
    if (components) {
      ids = components.split(':');
    }
    if (ids.length) {
      ids.forEach(function(id) {
        this.logger.trace(utils.prefix(this, this.resolve.name), 'resolving ', utils.quote(id));
        // try to find inside child components
        let e = this.component.find(id, true);
        if (!e) {
          // try to use components in parent's child
          this.logger.trace('searching', `'${id}'`, 'using parent');
          e = this.component.find(id, false, this.component);
        }
        if (e) {
          r.push(e);
        } else {
          this.logger.warn(`component with id=${id} was not found`);
        }
      }.bind(this));
    } else {
      // resolve to the cwd component
      r.push(this.component);
    }
    return r;
  }

}

module.exports.create = (logger, home) => {
  return new Appl(logger, home);
}
