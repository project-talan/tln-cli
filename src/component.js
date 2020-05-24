'use strict'

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const scriptFactory = require('./script');
const optionsFactory = require('./options');
const envFactory = require('./env');
const utils = require('./utils');

class Component {
  constructor(logger, tln, id, home, parent, descriptions) {
    this.logger = logger;
    this.tln = tln;
    this.id = id;
    this.home = home;
    this.parent = parent;
    this.uuid = '';
    if (this.parent) {
      const ids = [];
      if (this.parent.uuid) {
        ids.push(this.parent.uuid);
      }
      this.uuid = ids.concat([this.id]).join('/');
    }
    this.descriptions = descriptions;
    this.components = [];
  }

  getUuid() {
    if (this.uuid) return this.uuid;
    return '/';
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
  async inspect(cout, filter, envFromCli, outputAsJson, _) {
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
    const herarchy = await this.unfoldHierarchy(this.uuid, this.id, this.home, true);
    const {scripts, argv, env, dotenvs} = await this.collectScripts(herarchy, /.*/, filter, envFromCli, _);
    r.env = {};

    Object.keys(env).forEach( k => {
      let add = true;
      if (process.env[k]) {
        add = process.env[k] !== env[k];
      }
      if (add) {
        r.env[k] = env[k];
      }
    });
    r.dotenvs = dotenvs;
    r.steps = scripts.map( s => {return s.getUuid()});
    r.graph = herarchy.map( c => `${c.component.id} [${c.component.getUuid()}] [${c.anchor}]`);
    r.inherits = herarchy.filter(c => c.anchor === this.uuid).map( c => `${c.component.id} [${c.component.getUuid()}]`);
    r.depends = Component.getDependsList(herarchy, this.uuid).map( c => `${c.component.id} [${c.component.getUuid()}]`);


    /*/
    r.tags = [];
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
  async ls(cout, parents, depth, limit) {
    this.logger.info(`ls ${this.uuid} - depth:'${depth}' limit:'${limit}'`);
    await this.print(cout, parents, depth, limit);
  }

  /*
  * Print hierarchy of components
  * params:
  */
  async print(cout, parents, depth, limit, offset = '', last = false) {
    let prefix = ' ';
    if (parents && this.parent) {
      offset = `${await this.parent.print(cout, parents, 0, 0)} └`;
    }
    // output yourself
    let status = '';
    if (!fs.existsSync(this.home)) {
      status = '*'
    }
    const id = this.id === '' ? '/' : this.id;
    cout(`${offset}${prefix}${id} ${status}`);
    if (parents && offset.length) {
      offset = offset.slice(0, -1) + ' ';
    }
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
      if (offset.length && !parents) {
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
        await component.print(cout, false, depth - 1, limit, `${no}${delim}`, cnt === 0);
        if (!cnt) {
          break;
        }
      }
      if (more) {
        cout(`${offset}   ... ${more} more`);
      }
    }
    return offset;
  }


  //
  async exec(recursive, filter, envFromCli, dryRun, command, input, _) {
    this.logger.info(`exec ${this.uuid} - recursive:'${recursive}' command:'${command}' input:'${input}'`);
    const herarchy = await this.unfoldHierarchy(this.uuid, this.id, this.home);
    //
    if (recursive) {
      await this.buildAllChildren();
      for (const component of this.components) {
        await component.exec(recursive, filter, envFromCli, _, dryRun, command, input);
      }
    }
    //
    const script2Execute = scriptFactory.create(this.logger, 'clicmd', this.uuid, async (tln, script) => {
      if (command) {
        script.set([command])
      } else if (input) {
        script.set(input);
      } else {
        this.logger.warn(`${this.uuid} exec command input parameter is missing`);
      }
    });
    const { scripts, argv, env, dotenvs } = await this.collectScripts(herarchy, '', filter, envFromCli, _);
    await script2Execute.execute(this.home, this.tln, argv, env, dotenvs, false, dryRun);
  }

  //
  async run(steps, recursive, filter, envFromCli, save, dryRun, depends, _) {
    this.logger.info(`run ${this.uuid} - recursive:'${recursive}' steps:'${steps}' save:'${save}' dryRun:'${dryRun}' depends:'${depends}'`);
    const herarchy = await this.unfoldHierarchy(this.uuid, this.id, this.home);
    if (depends) {
      for(const d of Component.getDependsList(herarchy, this.uuid)) {
        await d.component.run(steps, false, filter, envFromCli, _, save, dryRun, false);
      }
    } else {
      for(const step of steps) {
        const {scripts, argv, env, dotenvs} = await this.collectScripts(herarchy, new RegExp(`\^${step}\$`), filter, envFromCli, _);
        for(const script of scripts) {
          if (await script.execute(this.home, this.tln, argv, env, dotenvs, save, dryRun)) {
            break;
          }
        }
      }
      if (recursive) {
      }
    }
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
      const cHome = (home) ? (home) : path.join((this.home), id);
      if (utils.isConfigPresent(cHome) || descriptions.length || force) {
        component = new Component(this.logger, this.tln, id, cHome, this, descriptions);
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

  async unfoldHierarchy(anchor, id, home, unique = true, list = []) {
    if (unique) {
      list = list.filter((item) => (item.anchor !== anchor) || (item.component.uuid !== this.uuid) && (item.anchor === anchor));
    }
    list.push({ component: this, anchor, id, home });

    // check depends list first
    let depends = [];
    for (const desc of this.descriptions) {
      if (desc.depends) {
        depends = depends.concat(await desc.depends(this.tln));
      }
    }
    for (let component of await this.resolve(depends)) {
      list = await component.unfoldHierarchy(component.uuid, component.id, component.home, unique, list);
    }

    // check inherits list first
    let inherits = [];
    for (const desc of this.descriptions) {
      if (desc.inherits) {
        inherits = inherits.concat(await desc.inherits(this.tln));
      }
    }
    for (let component of await this.resolve(inherits)) {
      list = await component.unfoldHierarchy(anchor, id, home, unique, list);
    }
    // check parents' hierarchy
    if (this.parent) {
      list = await this.parent.unfoldHierarchy(anchor, id, home, unique, list);
    }
    return list;
  }

  static getDependsList(hierarchy, anchor) {
    const r = [];
    return hierarchy
      .filter(c => c.anchor !== anchor)
      .reverse()
      .filter((item, pos, arr) => {
        for(let i = 0; i < arr.length; i++) {
          if (arr[i].component.uuid === item.component.uuid) {
            return i === pos;
          }
        }
        return true;
      })
      .reverse();
  }

  async collectScripts(hierarchy, pattern, filter, envFromCli, _) {
    let scripts = [];
    let envs = [];
    let dotenvs = [];
    // check all components from hierarchy and locate scripts
    for (const h of hierarchy) {
      (await h.component.findSteps(pattern, filter)).map(i => {
        // collect script from direct parent of inherits list
        if ((h.anchor === this.uuid) && (i.scripts.length)) {
          scripts.push(...i.scripts);
        }
        envs.push({ ...i.envs, id: h.id, home: h.home });
        dotenvs = dotenvs.concat(i.dotenvs.map(de => path.join(path.relative(h.component.home, this.home), de)));
      });
    }
    // merge all env and apply options
    let env = {...process.env };
    let argv = {};
    for (const e of envs.reverse()) {
      env = await e.env.build(this.tln, {...env, TLN_COMPONENT_ID: e.id, TLN_COMPONENT_HOME: e.home });
      argv = {...argv, ...(await e.options.parse(this.tln, _))};
    }
    return {scripts, argv, env: {...env, ...envFromCli, TLN_COMPONENT_ID: this.id, TLN_COMPONENT_HOME: this.home}, dotenvs: dotenvs.reverse()};
  }

  async findSteps(pattern, filter) {
    const r = [];
    for (const desc of this.descriptions) {
      let scripts = [];
      let env = envFactory.create(this.logger);
      let options = optionsFactory.create(this.logger);
      let dotenvs = [];
      // locate script
      if (desc.steps) {
        (await desc.steps(this.tln)).forEach(step => {
          if (step.id.match(pattern) && filter.validate(step.filter ? step.filter : '')) {
            scripts.push(scriptFactory.create(this.logger, step.id, this.uuid, step.builder));
          }
        });
      }
      // get env & options
      if (desc.env) {
        env.setBuilder(desc.env);
      }
      if (desc.options) {
        options.setBuilder(desc.options);
      }
      // get dotenvs
      if (desc.dotenvs) {
        dotenvs = await desc.dotenvs(this.tln);
      }
      r.push({ scripts, envs: {env : env, options: options}, dotenvs });
    }
    return r;
  }
}

module.exports.createRoot = (logger, tln, home, source) => {
  const root = new Component(logger, tln, '/', home, null, []);
  root.loadDescriptionsFromFolder(path.join(source, 'components'), false);
  root.loadDescriptions();
  return root;
}
