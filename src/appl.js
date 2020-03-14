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
    //
    let home = this.cwd;
    let folders = [];
    let dest = sharedDest;

    // find projects' root and current component
    if (dest) {
      // we are in detached mode
    } else {
      // find topmost level folder with with tln descs
      let p = home;
      let noConfig = !utils.isConfigPresent(p);
      while (!this.isRootPath(p)) {
        p = path.dirname(p);
        if (utils.isConfigPresent(p)) {
          home = p;
          noConfig = false;
        }
      }
      //
      // build chain of components from projects home to the current folder
      const rel = path.relative(home, cwd);
      if (rel) {
        folders = rel.split(path.sep);
      }
      //
      // deploy shared components
      if (this.isRootPath(this.cwd) || noConfig) {
        // inside tmp folder
        const tmpobj = tmp.dirSync({ template: 'tln-XXXXXX' });
        dest = tmpobj.name;
      } else {
        // at project's root level
        dest = home;
      }
    }
    //
    //
    this.logger.info('operating system: ', os.type(), os.platform(), os.release());
    this.logger.info(`cwd: ${this.cwd}`);
    this.logger.info('home:', home);
    this.logger.info(`cli home: ${cliHome}`);
    this.logger.info(`shared dest: ${dest}`);
    this.logger.info('folders:', folders);
    /*/
    this.rootComponent = require('./component').createRoot(this.logger, tln, projectsHome, presetsSrc, psDest);
    this.currentComponent = this.rootComponent;
    if (presetsDest) {
      this.currentComponent = this.rootComponent.createChild(cwd, true);
    } else {
      folders.forEach((folder) => {
        this.currentComponent = this.currentComponent.dive(folder, true);
      });
    }
    /*/
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
