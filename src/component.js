'use strict'

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const utils = require('./utils');

class Component {
  constructor(logger, id, home, parent, descriptions) {
    this.logger = logger;
    this.tln = {};
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

  /*
  * 
  * params:
  */
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

  /*
  * 
  * params:
  */
  async inspect(cout, outputAsJson) {
    this.logger.info(`inspect - '${this.uuid}' outputAsJson:'${outputAsJson}'`);
    //
    let r = {};
    r.id = this.id;
    r.uuid = this.uuid;
    r.home = this.home;
    r.parent = (this.parent) ? (this.parent.id) : (null);
    r.descriptions = [];
    this.descriptions.forEach(description => {
      r.descriptions.push(description.source);
    });
    // herarchy
    const herarchy = await this.unfoldHierarchy();
    r.inherits = herarchy.map( c => `${c.id} [${c.uuid}]`);
    /*/
    r.tags = [];
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

  /*
  * 
  * params:
  */
  async ls(cout, depth, limit) {
    this.logger.info(`ls ${this.uuid} - depth:'${depth}' limit:'${limit}'`);
    await this.print(cout, depth, limit);
  }

  /*
  * Print hierarchy of components
  * params:
  */
  async print(cout, depth, limit, offset = '', last = false) {
    // output yourself
    let status = '';
    if (!fs.existsSync(this.home)) {
      status = '*'
    }
    const id = this.id === '' ? '/' : this.id;
    cout(`${offset} ${id} ${status}`);
    //
    if (depth > 0) {
      await this.buildAllChildren();
      let more = 0;
      let cnt = this.components.length;
      if (limit > 0) {
        if (limit < cnt) {
          more = cnt - limit;
          cnt = limit;
        }
      }
      let no = offset;
      if (offset.length) {
        if (this.components.length) {
          no = offset.substring(0, offset.length - 1) + '│';
        }
        if (last) {
          no = offset.substring(0, offset.length - 1) + ' ';
        }
      }
      for (const component of this.components) {
        cnt--;
        const delim = (cnt) ? (' ├') : (' └');
        await component.print(cout, depth - 1, limit, `${no}${delim}`, cnt === 0);
        if (!cnt) {
          break;
        }
      }
      if (more) {
        cout(`${offset}   ... ${more} more`);
      }
    }
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
          ids.push({ name: name, path: p });
        }
      } catch (err) {
        this.logger.trace('Skip folder due to access restruction', p);
      }
    });
    return ids;
  }


  async getComponentsFromDesc(desc) {
    if (!desc.resolved) {
      if (desc.components) {
        desc.resolved = await desc.components(this.tln);
      }
    }
    return desc.resolved;
  }

  /*
  * Collect list of childs using all possible sources: descriptions, file system
  * params:
  */
  async getIDs() {
    // collect ids
    let ids = [];
    // ... from already created components
    this.components.forEach((c) => { ids.push(c.id); });
    // ... from descs
    for (const desc of this.descriptions) {
      const components = await this.getComponentsFromDesc(desc);
      //
      if (components) {
        for (const component of components) {
          ids.push(component.id);
        }
      }
    }
    // ... from file system
    if (fs.existsSync(this.home)) {
      ids = ids.concat(this.enumFolders(this.home).map(f => f.name));
    }
    // remove duplicates
    ids = utils.uniquea(ids);
    this.logger.trace('ids', ids);
    return ids;
  }


  //
  mergeDescriptions(location, configFolderOnly) {
    let descriptions = [];
    // load from file
    const configFile = utils.getConfigFile(location);
    if (fs.existsSync(configFile) && fs.lstatSync(configFile).isFile()) {
      const d = require(configFile);
      d.source = configFile;
      descriptions.push(d);
    }
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
      for (const item of this.enumFolders(location)) {
        for (const desc of this.mergeDescriptions(item.path, false)) {
          descs.push({ id: item.name, ...desc });
        }
      }
      if (descs.length) {
        descriptions.push({
          components: async (tln) => descs,
          source: location
        });
      }
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
      for (const desc of this.descriptions) {
        const components = await this.getComponentsFromDesc(desc);
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

  /*
  * Create all children components from available descriptions
  * params:
  */
  async buildAllChildren() {
    const ids = await this.getIDs();
    for (const id of ids) {
      await this.buildChild(id, false);
    }
  }

  /*
  * Find entity inside children or pop up to check parent and continue search there
  * params:
  */
  async find(ids, recursive = true, depth = 0, exclude = []) {
    let component = null;
    //console.log(this.id, ' ', ids);
    if (ids.length) {
      const id = ids[0];
      let nIds = ids;
      let nRecursive = true;
      //
      if (this.id === id) {
        component = this;
        if (ids.length > 1) {
          nIds = ids.slice(1);
          nRecursive = false;
        }
      }
      // recursive search
      if ((component && (ids.length > 1)) || (!component && recursive)) {
        for (const item of await this.getIDs()) {
          if (!exclude.includes(item)) {
            const c = await this.buildChild(item, false);
            if (c) {
              component = await c.find(nIds, nRecursive, depth + 1);
              if (component) {
                break;
              }
            }
          }
        }
      }
      // try to use one level upper
      if (!component && this.parent && (depth === 0)) {
        component = this.parent.find(ids, true, 0, [this.id]);
      }
    }
    return component;
  }

  async resolve(components, resolveEmptyToThis = false) {
    let r = [];
    if (components.length) {
      for (let component of components) {
        // find component
        const c = await this.find(component.split('/'));
        if (c) {
          r.push(c);
        } else {
          this.logger.error(`Component '${component}' was not found`);
        }
      }
      return r;
    } else {
      if (resolveEmptyToThis) {
        r.push(this);
      }
    }
    return r;
  }

  async unfoldHierarchy(unique = true, list = []) {
    if (unique) {
      list = list.filter((component) => component.uuid !== this.uuid);
    }
    list.push(this);
    // check inherits list first
    let inherits = [];
    for (const desc of this.descriptions) {
      if (desc.inherits) {
        inherits = inherits.concat(await desc.inherits(this.tln));
      }
    }
    for (let component of await this.resolve(inherits)) {
      list = await component.unfoldHierarchy(unique, list);
    }
    // check parents' hierarchy
    if (this.parent) {
      list = await this.parent.unfoldHierarchy(unique, list);
    }
    return list;
  }

}

module.exports.createRoot = (logger, home, source) => {
  const root = new Component(logger, '/', home, null, []);
  root.loadDescriptionsFromFolder(path.join(source, 'components'), false);
  root.loadDescriptions();
  return root;
}
