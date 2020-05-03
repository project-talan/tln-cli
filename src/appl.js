'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');

const tmp = require('tmp');

const logger = require('./logger');
const filterFactory = require('./filter');
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
    this.filter = filterFactory.create(this.logger);
    this.tln = Object.freeze({
      logger: this.logger,
      getOsInfo: () => {return {platform: 'win32'}},
      getDownloadScript: (tln, dist) => utils.getDownloadScript(tln, dist)
    })

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
      // shared components location
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
    this.rootComponent = require('./component').createRoot(this.logger, this.tln, this.dest, this.cliHome);
    this.currentComponent = this.rootComponent;
    if (detached) {
      this.currentComponent = await this.rootComponent.createChild(this.cwd);
    } else {
      for(const folder of folders) {
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

  //
  async config(components, repository, prefix, force, quite) {
    for(const component of await this.resolve(components)) {
      await component.config(repository, prefix, force, quite);
    }
  }

  //
  async inspect(components, env, argv, outputAsJson) {
    for(const component of await this.resolve(components)) {
      await component.inspect((...args) => { this.logger.con.apply(this.logger, args); }, this.filter, env, argv, outputAsJson);
    }
  }

  //
  async ls(components, parents, depth, limit) {
    for(const component of await this.resolve(components)) {
      await component.ls((...args) => { this.logger.con.apply(this.logger, args); }, parents, depth, limit);
    }
  }

  //
  async exec(components, parallel, recursive, envFromCli, argv, dryRun, command, input) {
    for(const component of await this.resolve(components)) {
      if (parallel) {
        component.exec(recursive, this.filter, envFromCli, argv, dryRun, command, input);
      } else {
        await component.exec(recursive, this.filter, envFromCli, argv, dryRun, command, input);
      }
    }
  }

  //
  async run(components, parallel, steps, recursive, envFromCli, argv, save, dryRun, depends) {
    for(const component of await this.resolve(components)) {
      if (parallel) {
        component.run(steps, recursive, this.filter, envFromCli, argv, save, dryRun, depends);
      } else {
        await component.run(steps, recursive, this.filter, envFromCli, argv, save, dryRun, depends );
      }
    }
  }

  //
  async resolve(components) {
    return this.currentComponent.resolve(components, true);
  }

  //
  isRootPath(p) {
    // TODO validate expression at windows box
    const root = (os.platform == "win32") ? `${this.cwd.split(path.sep)[0]}${path.sep}` : path.sep;
    return (p === root);
  }


}

module.exports.create = (verbose, cwd, cliHome, sharedDest) => {
  return new Appl(verbose, cwd, cliHome, sharedDest);
}
