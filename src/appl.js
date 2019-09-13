'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');

const utils = require('./utils');

class Appl {

  /*
  *
  * params:
  */
  constructor(logger, tln, cwd, cliHome, presetsDest) {
    this.presetsDest = presetsDest;
    this.logger = logger;
    //
    // evaluate projects' root and current component
    let projectsHome = cwd;
    // find topmost level folder with with tln descs
    let p = projectsHome;
    while(!utils.isRootPath(p)) {
      p = path.dirname(p);
      if (utils.isConfPresent(p)) {
        projectsHome = p;
      }
    }
    //
    // build chain of components from projects home to the current folder
    let folders = [];
    const rel = path.relative(projectsHome, cwd);
    if (rel) {
      folders = rel.split(path.sep);
    }
    //
    // Deploy presets at project's root level
    let psDest = presetsDest;
    if (!psDest) {
      psDest = projectsHome;
    }
    //
    //
    this.logger.info('Operating system: ', os.type(), os.platform(), os.release());
    this.logger.info('Projects home:', projectsHome);
    this.logger.info('Cli home:', cliHome);
    this.logger.info('Presets destination:', psDest);
    this.logger.info('Cwd:', cwd);
    this.logger.info('Folders:', folders);
    //
    this.rootComponent = require('./component').createRoot(this.logger, tln, projectsHome, cliHome, psDest);
    this.currentComponent = this.rootComponent;
    folders.forEach((folder) => {
      this.currentComponent = this.currentComponent.dive(folder, true);
    });
  }

  /*
  *
  * params:
  */
  initComponentConfiguration(options) {
    this.currentComponent.initConfiguration(options);
  }

  /*
  *
  * params:
  */
  updateComponentConfiguration() {
    this.currentComponent.updateConfiguration();
  }

  /*
  * Function is used during initial components lookup from command line parameter
  * components are colon separated string of ids (paths)
  * every id can be
  * (1) exact component id, like git:        will be looked inside child hierarchy of current component
  * (2) absolute path /java/openjdk-11.0.2:  lookup will start from root component
  * (3) relative path static/html:           the same as (1)
  * params:
  */
  resolve(components) {
    let ids = [];
    if (components) {
      ids = components.split(':');
    }
    return this.currentComponent.resolve(ids, true);
  }

}

module.exports.create = (logger, tln, cwd, cliHome, presetsDest) => {
  return new Appl(logger, tln, cwd, cliHome, presetsDest);
}
