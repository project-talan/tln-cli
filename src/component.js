'use strict'

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const utils = require('./utils');

class Component {
  constructor(logger, id, home, parent, descriptions) {
    this.logger = logger;
    this.id = id;
    this.home = home;
    this.parent = parent;
    this.uuid = '';
    if (this.parent) {
      this.uuid = [this.parent.uuid, this.id].join('/');
    }
    this.descriptions = descriptions;
    this.components = [];
  }

  async config(repository, prefix, force, terse) {
    this.logger.info(`config - '${this.uuid}' repository:'${repository}' prefix:'${prefix}' force:'${force}' terse:'${terse}'`);
    //
    if (repository) {
      // clone repo with tln configuration
      let folder = utils.getConfigFolder(this.home);
      if (prefix) {
        folder = path.join(folder, prefix);
      }
      //
      if (fs.existsSync(folder)) {
        this.logger.warn(`Git repository with tln configuration already exists in '${folder}'. Use git pull to update it`);
      } else {
        this.logger.con(execSync(`git clone ${repository} ${folder}`).toString());
      }
    } else {
      // generate local configuration file
      const fileName = utils.getConfigFile(this.home);
      const fe = fs.existsSync(fileName);
      let generateFile = true;
      if (fe && !force) {
        this.logger.error(`Configuration file already exists '${fileName}', use --force to override`);
        generateFile = false;
      }
      if (generateFile) {
        const templateFileName = path.join(__dirname, '.tln.conf.template');
        if (terse) {
          const reg = /\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm;
          fs.writeFile(fileName, fs.readFileSync(templateFileName).toString().replace(reg, ''), (err) => {
            if (err) {
              this.logger.con(err);
            } else {
              this.logger.con(`done: ${fileName}`);
            }
          });
        } else {
          await fs.copyFile(templateFileName, fileName, (err) => {
            if (err) {
              this.logger.error(err);
            } else {
              this.logger.con(`done: ${fileName}`);
            }
          });
        }
      }
    }
  }

  async inspect(outputAsJson) {
    this.logger.info(`inspect - '${this.uuid}' outputAsJson:'${outputAsJson}'`);
  }

  //
  async ls(depth) {
    this.logger.info(`ls ${this.uuid} - depth:'${depth}'`);
    this.logger.info(this);
  }

  //
  async exec(recursive, command, input) {
    this.logger.info(`exec ${this.uuid} - recursive:'${recursive}' command:'${command}' input:'${input}'`);
    this.logger.con(this);
  }

  //
  async run(recursive, steps, save, dryRun, depends) {
    this.logger.info(`run ${this.uuid} - recursive:'${recursive}' steps:'${steps}' save:'${save}' dryRun:'${dryRun}' depends:'${depends}'`);
  }

  //
  async createChild(home) {
    return await this.buildChild(path.basename(home), true, path.dirname(home));
  }

  //
  async buildChild(id, force, home = null) {
    // check if entity was already created
    let component = this.components.find((c) => { return c.id === id; });
    //
    if (!component) {
      // collect description from already loaded sources
      const descriptions = [];
      // create child entity
      const cHome = path.join((home) ? (home) : (this.home), id);
      if (utils.isConfigPresent(cHome) || descriptions.length || force) {
        component = new Component(this.logger, id, cHome, this, descriptions);
        this.components.push(component);
      }
    }
    return component;
  }
}

module.exports.createRoot = (logger, home, source, destination) => {
  const root = new Component(logger, '', home, null, []);
//  root.loadDescriptionsFromFolder(source, destination, 'presets');
//  root.loadDescriptions();
  return root;
}

module.exports.create = (logger, id, home, parent, descriptions) => {
  return new Component(logger, id, home, parent, descriptions);
}
