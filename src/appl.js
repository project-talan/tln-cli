'use strict';

const os = require('os');
const path = require('path');
const fs = require('fs');

const utils = require('./utils');

class appl {

  constructor(options) {
    const {verbose, detached, destPath, env, envVars, envFiles, cwd, home} = options;
    //
    this.logger = require('./logger').create(verbose);
    this.detached = detached;
    this.destPath = destPath;
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
    // TODO for test only
    this.env = {...this.env, ...this.cmdLineEnv};
    //
    this.cwd = cwd;
    this.home = home;
    this.stdCatalog = path.join(this.home, 'components');
    //
    this.tln = Object.freeze({
      logger: this.logger,
      os,
      path,
      fs,
      utils,
    });

    //
    this.logger.info('operating system:', this.tln.os.type(), this.tln.os.platform(), this.tln.os.release());
    this.logger.info(`cwd: ${this.cwd}`);
    this.logger.info(`home: ${this.home}`);
    this.logger.info(`stdCatalog: ${this.stdCatalog}`);
    this.logger.info(`mode: ${this.detached ? 'detached' : 'normal'}`);
    this.logger.info(`destPath: ${this.destPath}`);
    this.logger.debug('env:');
    Object.keys(this.env).sort().forEach(k => this.logger.debug(`\t${k}=${this.env[k]}`));
  }

  splitComponents(components) {
    return components?components.split(':'):[];
  }

  async init(params) {
    /*/
    // load catalogs or create new one with default item
    const context = this.getContext('logger', 'os', 'path', 'fs');
    if (!this.fs.existsSync(this.listOfCatalogs)) {
      // create file with default catalog
      this.catalogs.push(catalog.create(context.duplicate().add({name: 'default', src: null, home: this.path.join(this.home, 'components')})));
      await this.saveCatalogs();
    } else {
      //
      try {
        const catalogs = JSON.parse(this.fs.readFileSync(this.listOfCatalogs));
        for(const c of catalogs) {
          this.catalogs.push(catalog.create(context.duplicate().add(c)));
        }
      } catch (e) {
        this.logger.error(`Description of catalogs can not be loaded [${this.listOfCatalogs}] ${e.message}`);
        process.exit(1);
      }
    }
    //
    // find root component
    /*/
    return this;
  }

  async inspect(components, {commands, environment, graph, json}) {
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
