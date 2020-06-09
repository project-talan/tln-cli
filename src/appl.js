'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');

const logger = require('./logger');
const filterFactory = require('./filter');
const utils = require('./utils');

class Appl {

  /*
  *
  * params:
  */
  constructor(verbose, cwd, cliHome, detach, localRepo) {
    this.logger = logger.create(verbose);
    this.cwd = cwd;
    this.cliHome = cliHome;
    this.detach = detach;
    this.localRepo = localRepo;
    this.home = this.cwd;
    this.filter = filterFactory.create(this.logger);
    this.tln = {};

  }

  async init() {
    await this.filter.configure();
    this.tln = Object.freeze({
      logger: this.logger,
      isWindows: () => this.filter.isWindows(),
      isLinux: () => this.filter.isLinux(),
      isDarwin: () => this.filter.isDarwin(),
      getOsInfo: () => this.filter.getOsInfo(),
      unpackId: (id) => {
        const arr = id.split('-');
        const version = arr.pop();
        return {name: arr.join('-'), version};
      },
      copyTemplate: (tln, script, src, dest, tail = []) => utils.copyTemplate(tln, script, src, dest, tail),
      canInstallComponent: (tln, id, home) => utils.canInstallComponent(tln, id, home),
      getDownloadScriptById: (tln, id, distrs) => utils.getDownloadScriptById(tln, id, distrs),
      getDownloadScript: (tln, dist) => utils.getDownloadScript(tln, dist)
    })

    //
    let folders = [];
    let detached = false;
    const tmpPath = path.join(os.tmpdir(), 'tln');
    // find projects' root and current component
    if (this.detach || this.localRepo) {
      // we are in detached mode
      this.localRepo = this.localRepo || tmpPath;
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
        this.localRepo = tmpPath;
        detached = true;
      } else {
        // at project's root level
        this.localRepo = this.home;
      }
    }
    fs.mkdirSync(this.localRepo, { recursive: true });
    this.rootComponent = require('./component').createRoot(this.logger, this.tln, this.localRepo, this.cliHome);
    this.currentComponent = this.rootComponent;
    if (detached) {
      this.currentComponent = await this.rootComponent.createChild(this.cwd);
    } else {
      for(const folder of folders) {
        this.currentComponent = await this.currentComponent.buildChild(folder, true);
      }
    }
    //
    this.logger.info('operating system: ', os.type(), os.platform(), os.release());
    this.logger.info(`cwd: ${this.cwd}`);
    this.logger.info('home:', this.home);
    this.logger.info(`cli home: ${this.cliHome}`);
    this.logger.info(`local repo: ${this.localRepo}`);
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
  async inspect(components, env, outputAsJson, _) {
    for(const component of await this.resolve(components)) {
      await component.inspect((...args) => { this.logger.con.apply(this.logger, args); }, this.filter, env, outputAsJson, _);
    }
  }

  //
  async ls(components, parents, depth, limit, installedOnly) {
    for(const component of await this.resolve(components)) {
      await component.ls((...args) => { this.logger.con.apply(this.logger, args); }, parents, depth, limit, installedOnly);
    }
  }

  //
  async exec(components, parallel, recursive, envFromCli, dryRun, command, input, _) {
    for(const component of await this.resolve(components)) {
      if (parallel) {
        component.exec(recursive, this.filter, envFromCli, dryRun, command, input, _);
      } else {
        await component.exec(recursive, this.filter, envFromCli, dryRun, command, input, _);
      }
    }
  }

  //
  async run(components, parallel, steps, recursive, envFromCli, save, dryRun, depends, _) {
    for(const component of await this.resolve(components)) {
      if (parallel) {
        component.run(steps, recursive, this.filter, envFromCli, save, dryRun, depends, _);
      } else {
        await component.run(steps, recursive, this.filter, envFromCli, save, dryRun, depends, _);
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

module.exports.create = (verbose, cwd, cliHome, detach, localRepo) => {
  return new Appl(verbose, cwd, cliHome, detach, localRepo);
}
