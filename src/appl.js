'use strict';

const os = require('os');
const path = require('path');
const fs = require('fs');

const utils = require('./utils');

class appl {

  constructor(options) {
    //
    const {configPath, verbose, detached, destPath, env, envVars, envFiles, cwd, tlnHome} = options;
    //
    this.configPath = configPath;
    this.logger = require('./logger').create(verbose);
    /*/
      * if TLN_DETACHED environment variable is defined, than this is nested call
        and should be executed in detahced mode too
      * if destPath is not defined, all components will be installed in user's tmp folder
    /*/
    this.detached = detached || !!env.TLN_DETACHED;
    this.destPath = destPath || env.TLN_DETACHED;
    //
    this.env = {...env};
    this.cmdLineEnv = {};
    // parse files with environment variables
    if (envFiles) {
      envFiles.map(v => utils.parseEnvFile(v, this.logger)).filter(v => !!v).forEach(v => this.cmdLineEnv = {...this.cmdLineEnv, ...v});
    }
    // parse command line arguments with environment variables
    if (envVars) {
      envVars.map(v => utils.parseEnvRecord(v, this.logger)).filter(v => !!v).forEach(v => this.cmdLineEnv = {...this.cmdLineEnv, ...v});
    }
    //
    this.cwd = cwd;
    this.tlnHome = tlnHome;
    this.stdCatalog = path.join(this.tlnHome, 'components');
    //
    // find root component
    const {root, current} = this.constructInitialHierarchy();
    this.rootComponent = root;
    this.currentComponent = current;
    //
    //
    if (this.detached) {
      // Set TLN_DETACHED to turn on detached mode for nested calls
      this.destPath = this.destPath || path.join(os.tmpdir(), `tln-${this.env.USER}`);
      this.env.TLN_DETACHED = this.destPath;
    } else {
      // set default value for third-parties - root component
    }
    //
    // Prepare tln shared object 
    this.tln = Object.freeze({
      logger: this.logger,
      os,
      path,
      fs,
      utils,
    });
    //
    this.logger.info(`path to config: ${this.configPath}`);
    this.logger.info('operating system:', this.tln.os.type(), this.tln.os.platform(), this.tln.os.release());
    this.logger.info(`cwd: ${this.cwd}`);
    this.logger.info(`tlnHome: ${this.tlnHome}`);
    this.logger.info(`stdCatalog: ${this.stdCatalog}`);
    this.logger.info(`mode: ${this.detached ? 'detached' : 'normal'}`);
    this.logger.info(`destPath: ${this.destPath}`);
//    this.logger.info(`root component: ${this.rootComponent.getHome()}`);
//    this.logger.info(`current component: ${this.currentComponent.getHome()}`);
    this.logger.debug('env:');
    Object.keys({...this.env, ...this.cmdLineEnv}).sort().forEach(k => this.logger.debug(`\t${k}=${this.env[k]}`));
    //
  }

  constructInitialHierarchy() {
    let root = null;
    let current = null;
    return {root, current};
  }

  splitComponents(components) {
    return components?components.split(':'):[];
  }

  async inspect(components, {cmds, env, graph, json}) {
  }

  async ls(components, {depth, limit, parents, installedOnly}) {
  }

  async createCatalog(brief) {
  }

  async lsCatalogs() {
    /*
    const padC1 = 18;const padC2 = 48;
    this.logger.con('Name'.padEnd(padC1), 'Source'.padEnd(padC2), 'Home');
    this.catalogs.forEach(catalog => this.logger.con(catalog.name.padEnd(padC1), ((catalog.src)?catalog.src:'-').padEnd(padC2), catalog.home));
    */
  }

  async addCatalog(name, src) {
    /*
    const context = this.getContext('logger', 'os', 'path', 'fs');
    this.catalogs.push(catalog.create(context.duplicate().add({name, src, home: this.path.join(this.path2Catalogs, name)})));
    await this.saveCatalogs();
    */
  }

  async updateCatalog(name) {
  }

  async getHierarchy(components, {depth, parents}) {
  }

  async run(commands, components, {parallel, recursive, parentFirst, dryRun, env, envFile, all, force, depend, inherit, continueOnStderr}, command, file){
    if (command) {
      // interpret commands as explicit shell script
    } else if (file) {
      // interpred commands as script file name
    } else {
      // file commands inside component's descriptions
    }
    // run commands
  }

}

module.exports.create = (options) => {
  return new appl(options);
}
