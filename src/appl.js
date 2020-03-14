'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');

const tmp = require('tmp');

const logger = require('./logger');
const utils = require('./utils');

class Appl {

  /*
  *
  * params:
  */
  constructor(verbose, cwd, cliHome, sharedDest) {
    this.logger = logger.create(verbose);
    this.cwd = cwd;
    this.cliHome = cliHome;
    this.dest = sharedDest;
    this.home = this.cwd;
  }

  async init() {
    //
    let folders = [];
    let detached = false;
    // find projects' root and current component
    if (this.dest) {
      // we are in detached mode
      detached = true;
    } else {
      // find topmost level folder with with tln descs
      let p = this.home;
      let noConfig = !utils.isConfigPresent(p);
      while (!this.isRootPath(p)) {
        p = path.dirname(p);
        if (utils.isConfigPresent(p)) {
          this.home = p;
          noConfig = false;
        }
      }
      //
      // build chain of components from projects home to the current folder
      const rel = path.relative(this.home, this.cwd);
      if (rel) {
        folders = rel.split(path.sep);
      }
      //
      // deploy shared components
      if (this.isRootPath(this.cwd) || noConfig) {
        // inside tmp folder
        const tmpobj = tmp.dirSync({ template: 'tln-XXXXXX' });
        this.dest = tmpobj.name;
        detached = true;
      } else {
        // at project's root level
        this.dest = this.home;
      }
    }
    this.rootComponent = require('./component').createRoot(this.logger, this.dest, this.cliHome, this.dest);
    this.currentComponent = this.rootComponent;
    if (detached) {
      this.currentComponent = await this.rootComponent.createChild(this.cwd);
    } else {
      for(folder in folders) {
        this.currentComponent = await this.currentComponent.buildChild(folder, true);
      };
    }
    //
    this.logger.info('operating system: ', os.type(), os.platform(), os.release());
    this.logger.info(`cwd: ${this.cwd}`);
    this.logger.info('home:', this.home);
    this.logger.info(`cli home: ${this.cliHome}`);
    this.logger.info(`shared dest: ${this.dest}`);
    this.logger.info('folders:', folders);
    this.logger.info('mode:', detached ? 'detached' : 'normal');
  }

  async config(repository, force, quite) {
    this.logger.info(`config: '${repository}' '${force}' '${quite}'`);
  }

  //
  isRootPath(p) {
    // TODO validate expression at windows box
    const root = (os.platform == "win32") ? `${this.cwd().split(path.sep)[0]}${path.sep}` : path.sep;
    return (p === root);
  }


}

module.exports.create = (verbose, cwd, cliHome, sharedDest) => {
  return new Appl(verbose, cwd, cliHome, sharedDest);
}
