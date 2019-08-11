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
  constructor(verbose, cwd, cliHome, presetsDest) {
    this.presetsDest = presetsDest;
    this.logger = require('./logger').create(verbose);
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
    this.rootComponent = require('./component').createRoot(this.logger, projectsHome, cliHome, psDest);
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

  /*
  *
  * Function is used during initial components lookup from command line parameter
  * components are colon separated string of ids (paths)
  * every id can be
  * (1) exact component id, like git:        will be looked inside child hierarchy of current component
  * (2) absolute path /java/openjdk-11.0.2:  lookup will start from root component
  * (3) relative path static/html:           the same as (1)
  * params:
  */
  resolve(components) {
    this.logger.trace(`List to resolve [${components}]`);
    let r = [];
    let ids = [];
    if (components) {
      ids = components.split(':');
    }
    if (ids.length) {
      /*
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
      });
      */
    } else {
      // resolve to the current folder component
      r.push(this.currentComponent);
    }
    return r;
  }

}

module.exports.create = (verbose, cwd, cliHome, presetsDest) => {
  return new Appl(verbose, cwd, cliHome, presetsDest);
}
