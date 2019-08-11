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
  constructor(verbose, cliHome, presetsDest) {
    this.presetsSrc = path.join(cliHome, 'presets');
    this.presetsDest = presetsDest;
    this.logger = require('./logger').create(verbose);
    //
    // evaluate projects' root and current component
    let cwd = process.cwd();
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
    if (!this.presetsDest) {
      this.presetsDest = projectsHome;
    }
    //
    //
    this.logger.info('Operating system: ', os.type(), os.platform(), os.release());
    this.logger.info('Projects home:', projectsHome);
    this.logger.info('Presets source:', this.presetsSrc);
    this.logger.info('Presets destination:', this.presetsDest);
    this.logger.info('Cwd:', cwd);
    this.logger.info('Folders:', folders);
    //
    this.rootComponent = require('./component').createRoot(this.logger, projectsHome, this.presetsSrc, this.presetsDest);
    this.currentComponent = this.rootComponent;
    folders.forEach((folder) => {
      // this.currentComponent = this.currentComponent.dive(folder, true);
    });
  }

  /*
  *
  * params:
  */
  initComponentConfiguration(options) {
    this.currentComponent.initConfiguration(options);
  }

}

module.exports.create = (verbose, cliHome, presetsDest) => {
  return new Appl(verbose, cliHome, presetsDest);
}
