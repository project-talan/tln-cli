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

  // --------------------------------------------------------------------------
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

  async inspect(outputAsJson, cout) {
    this.logger.info(`inspect - '${this.uuid}' outputAsJson:'${outputAsJson}'`);
    //
    let r = {};
    r.id = this.id;
    r.uuid = this.uuid;
    r.home = this.home;
    //r.uuid = this.uuid;
    r.parent = (this.parent) ? (this.parent.id) : (null);
    r.descriptions = [];
    this.descriptions.forEach(description => {
      r.descriptions.push(description.source);
    });
    /*/
    r.tags = [];
    r.inherits = [];
    r.depends = [];
    //
    const steps = this.findStep('*', filter, this.home, cntx, [], r.inherits);
    //
    r.env = {};
    const { vars, env } = this.buildEnvironment(this.getVariables([], r.depends));
    for (let v in vars) {
      r.env[v] = vars[v];
    }
    //
    r.dotenvs = [];
    r.steps = [];
    for (const step of steps) {
      r.dotenvs = r.dotenvs.concat(step.cntx.dotenvs);
      r.steps.push(step.script.uuid);
    }
    r.dotenvs = utils.uniquea(r.dotenvs);
    r.inherits = utils.uniquea(r.inherits);
    r.depends = utils.uniquea(r.depends);
    /*/
    if (outputAsJson) {
      cout(JSON.stringify(r, null, 2));
    } else {
      cout((require('yaml')).stringify(r));
    }
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

  // --------------------------------------------------------------------------

  enumFolders(location, exclude = ['.git', '.tln']) {
    let ids = [];
    fs.readdirSync(location).forEach(name => {
      const p = path.join(location, name);
      try {
        if (fs.lstatSync(p).isDirectory() && exclude.indexOf(name) == -1) {
          ids.push({name:name, path:p});
        }
      } catch (err) {
        this.logger.trace('Skip folder due to access restruction', p);
      }
    });
    return ids;
  }

  //
  mergeDescriptions(location, configFolderOnly) {
    let descriptions = [];
    // check folder(s)
    if (configFolderOnly) {
      // check .tln folder only
      const configFolder = utils.getConfigFolder(location);
      if (fs.existsSync(configFolder)) {
        descriptions = descriptions.concat(this.mergeDescriptions(configFolder, false));
      }
    } else {
      const descs = [];
      // scan all subfolders
      for(const item of this.enumFolders(location)) {
        for(const desc of this.mergeDescriptions(item.path, false)) {
          descs.push({id: item.name, ...desc});
        }
      }
      if (descs.length) {
        descriptions.push({
          components: async (tln) => descs,
          source: location
        });
      }
    }
    // load from file
    const configFile = utils.getConfigFile(location);
    if (fs.existsSync(configFile) && fs.lstatSync(configFile).isFile()) {
      const d = require(configFile);
      d.source = configFile;
      descriptions.push(d);
    }
    return descriptions;
  }

  //
  loadDescriptionsFromFolder(location, configFolderOnly) {
    this.descriptions = this.descriptions.concat(this.mergeDescriptions(location, configFolderOnly));
  }

  //
  loadDescriptions() {
    this.loadDescriptionsFromFolder(this.home, true);
  }

  // --------------------------------------------------------------------------

  // child component will have home path different from parent
  async createChild(home) {
    return await this.buildChild(path.basename(home), true, home);
  }

  // child component will inherit home hierarchy from parent
  async buildChild(id, force, home = null) {
    // check if entity was already created
    let component = this.components.find((c) => { return c.id === id; });
    //
    if (!component) {
      // collect description from already loaded sources
      const descriptions = [];
      for(const desc of this.descriptions) {
        let components = [];
        if (desc.components) {
          components = await desc.components({});
        }
        //
        if (components) {
          for (const component of components) {
            if (component.id === id) {
              component.source = desc.source;
              descriptions.push(component);
            }
          }
        }
      }
      // create child entity
      const cHome = path.join((home) ? (home) : (this.home), id);
      if (utils.isConfigPresent(cHome) || descriptions.length || force) {
        component = new Component(this.logger, id, cHome, this, descriptions);
        component.loadDescriptions();
        this.components.push(component);
      }
    }
    return component;
  }

  async resolve(components, resolveEmptyToThis = false) {
    let r = [];
    if (components.length) {
      for(let component of components) {
        // find component
        this.logger.error(`Component '${component}' was not found`);
      }
      return r;
    } else {
      if (resolveEmptyToThis) {
        r.push(this);
      }
    }
    return r;
  }

}

module.exports.createRoot = (logger, home, source) => {
  const root = new Component(logger, '', home, null, []);
  root.loadDescriptionsFromFolder(path.join(source, 'components'), false);
  root.loadDescriptions();
  return root;
}
