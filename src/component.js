'use strict'

const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const { execSync } = require('child_process');
const tmp = require('tmp');
const compareVersions = require('compare-versions');
const dotenv = require('dotenv');

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

  getRoot() {
    if (this.parent) {
      return this.parent.getRoot();
    }
    return this;
  }

  isRoot() {
    return this.parent === null;
  }

  /*
  * 
  * params:
  */
  async config({ envFromCli, repository, update, folder, force, terse, depend, inherit }) {
    this.logParams('config', { envFromCli, repository, update, folder, force, terse, depend, inherit });
    //
    if (repository || update) {
      // clone repo with tln configuration
      let f = utils.getConfigFolder(this.home);
      if (folder) {
        f = path.join(f, folder);
      }
      //
      if (fs.existsSync(f)) {
        if (update) {
          try {
            this.logger.con(execSync(`cd ${f} && git pull origin`).toString());
          } catch (err) {
            // this.logger.error(err.message);
          }
        } else {
          this.logger.warn(`Git repository with tln configuration already exists in '${f}'. Use 'tln config --update' command.`);
        }
      } else {
        if (update) {
          this.logger.warn(`Git repository with tln configuration does not exist in '${f}'. Use 'tln config --repo <repo>' command.`);
        } else {
          try {
            this.logger.con(execSync(`git clone ${repository} ${f}`).toString());
          } catch (err) {
            // this.logger.error(err.message);
          }
        }
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
        let content = fs.readFileSync(templateFileName).toString();
        if (terse) {
          const reg = /\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm;
          content = content.replace(reg, '');
        }
        const envs = Object.keys(envFromCli).map(e => `    env.${e} = '${envFromCli[e]}';`).join('\n');
        content = content.replace(/ENVS/gm, `\n${envs}\n  `);
        //
        const inherits = inherit.map(v => `'${v}'`).join(',');
        content = content.replace(/INHERITS/gm, inherits);
        //
        const depends = depend.map(v => `'${v}'`).join(',');
        content = content.replace(/DEPENDS/gm, depends);
        // write config
        fs.writeFile(fileName, content, (err) => {
          if (err) {
            this.logger.con(err);
          } else {
            this.logger.con(`done: ${fileName}`);
          }
        });
      }
    }
  }

  logParams(funcName, params) {
    this.logger.info(funcName, [`uuid: ${this.uuid}`].concat(Object.keys(params).map(k => `${k}: ${JSON.stringify(params[k])}`)).join(', '));
  }

  /*
  * 
  * params:
  */
  async dotenv({ envFromCli, prefixes, input, output, upstream, downstream, catalogs }) {
    this.logParams('dotenv', { envFromCli, input, output, catalogs });
    await this.loadDescriptionsFromCatalogs(catalogs);
    //
    let vars = {};
    await this.transformDotenv(vars, [], input, upstream, downstream, [], false);
    vars = { ...envFromCli, ...vars };
    fs.writeFileSync(path.join(this.home, output), Object.keys(vars).sort().map(k => `${prefixes.concat(k).join('_')}=${vars[k]}`).join('\n'));
  }

  /*
  * 
  * params:
  */
  async transformDotenv(vars, prefixes, input, upstream, downstream, exclude, neighbor = true) {
    let r = [];
    exclude.push(this.id);
    //console.log(`[+] ${this.id}`, prefixes, exclude);
    if (upstream > 0 && this.parent && !exclude.includes(this.parent.id)) {
      r = [this.id.toUpperCase()];
      const ids = await this.parent.transformDotenv(vars, [], input, upstream - 1, downstream + 1, exclude);
      if (neighbor) {
        prefixes = ids.concat(this.id.toUpperCase());
      }
    }
    //console.log(`    ${this.id}`, prefixes);
    //
    const fn = path.join(this.home, input);
    if (fs.existsSync(fn)) {
      const config = dotenv.parse(Buffer.from(fs.readFileSync(fn).toString()));
      Object.keys(config).forEach(k => vars[prefixes.concat(k).join('_')] = config[k]);
    }
    //
    if (downstream > 0) {
      await this.buildAllChildren();
      for (const component of this.components) {
        if (!exclude.includes(component.id) && fs.existsSync(component.home)) {
          await component.transformDotenv(vars, prefixes.concat(component.id.toUpperCase()), input, upstream + 1, downstream - 1, exclude);
        }
      }
    }
    //console.log(`[-] ${this.id}`);
    return r;
  }

  /*
  * 
  * params:
  */
  async inspect(cout, filter, { envFromCli, outputAsJson, _, catalogs }) {
    this.logger.info(`inspect - '${this.uuid}' outputAsJson:'${outputAsJson}'`);
    await this.loadDescriptionsFromCatalogs(catalogs);
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
    const { scripts, env, dotenvs } = await this.collectScripts(herarchy, /.*/, filter, envFromCli, _);
    r.env = {};

    Object.keys(env).forEach(k => {
      let add = true;
      if (process.env[k]) {
        add = process.env[k] !== env[k];
      }
      if (add) {
        r.env[k] = env[k];
      }
    });
    r.dotenvs = dotenvs;
    r.steps = scripts.map(s => { return s.getUuid() });
    r.graph = herarchy.map(c => `${c.component.id} [${c.component.getUuid()}] [${c.anchor}]`);
    r.inherits = herarchy.filter(c => c.anchor === this.uuid).map(c => `${c.component.id} [${c.component.getUuid()}]`);
    r.depends = Component.getDependsList(herarchy, this.uuid).map(c => `${c.component.id} [${c.component.getUuid()}]`);


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
  async ls(cout, { parents, depth, limit, installedOnly, catalogs }) {
    this.logger.info(`ls ${this.uuid} - depth:'${depth}' limit:'${limit}'`);
    await this.loadDescriptionsFromCatalogs(catalogs);
    await this.print(cout, await this.filterComponents({ parents, depth, limit, installedOnly }));
  }

  /*
  * Print hierarchy of components
  * params:
  */
  async print(cout, item, offset = '', last = false) {
    const installed = item.installed ? '' : ' *';
    cout(`${offset} ${item.id}${installed}`);
    let cnt = item.children.length;
    let no = offset;
    if (offset.length) {
      if (this.components.length) {
        no = offset.substring(0, offset.length - 1) + '│';
      }
      if (last) {
        no = offset.substring(0, offset.length - 1) + ' ';
      }
    }
    for (const i of item.children) {
      cnt--;
      const delim = (cnt) ? (' ├') : (' └');
      this.print(cout, i, `${no}${delim}`, cnt === 0);
    }
    if (item.more) {
      cout(`${no}   ... ${item.more} more`);
    }
  }

  async filterComponents({ parents, depth, limit, installedOnly }, children = []) {
    const id = this.id === '' ? '/' : this.id;
    const { name, version } = utils.unpackId(id);
    let item = {
      id,
      version,
      installed: fs.existsSync(this.home),
      children,
      more: 0
    };
    //
    if (!item.installed && installedOnly) {
      return null;
    }
    //
    if (depth) {
      await this.buildAllChildren();
      let cnt = this.components.length;
      if (limit > 0) {
        if (limit < cnt) {
          cnt = limit;
        }
      }
      for (const component of this.components) {
        const e = await component.filterComponents({ parents: false, depth: depth - 1, limit, installedOnly });
        if (e) {
          item.children.push(e);
          if (item.children.length >= cnt) {
            item.more = this.components.length - item.children.length;
            break;
          }
        }
      }
      // sort
      if (item.children.length > 0) {
        if (compareVersions.validate(item.children[0].version)) {
          item.children.sort((l, r) => {
            if (l.version && r.version) {
              if (compareVersions.compare(l.version, r.version, '>')) {
                return -1;
              }
            } else {
              this.logger.warn('Invalid versions', l, r);
            }
            return 1;
          });
        } else {
          item.children.sort((l, r) => { if (l.id > r.id) { return 1; } else if (l.id < r.id) { return -1; } return 0; });
        }
      }
    }
    //
    if (parents && this.parent) {
      return await this.parent.filterComponents({ parents, depth: 0, limit: 0, installedOnly }, [item]);
    }
    return item;
  }

  //
  async exec(recursive, depth, filter, { envFromCli, dryRun, failOnStderr, command, input, _, catalogs, parentFirst }) {
    this.logger.info(`exec ${this.uuid} - recursive:'${recursive}' command:'${command}' input:'${input}'`);
    await this.loadDescriptionsFromCatalogs(catalogs);
    const herarchy = await this.unfoldHierarchy(this.uuid, this.id, this.home);
    //
    const execChildren = async () => {
      if (recursive && (depth > 1)) {
        await this.buildAllChildren();
        for (const component of this.components) {
          await component.exec(recursive, depth - 1, filter, { envFromCli, dryRun, failOnStderr, command, input, _, catalogs, parentFirst });
        }
      }
    }
    const execSelf = async () => {
      const script2Execute = scriptFactory.create(this.logger, 'clicmd', this.uuid, true, async (tln, script) => {
        if (command) {
          script.set([command])
        } else if (input) {
          script.set(input);
        } else {
          this.logger.warn(`${this.uuid} exec command input parameter is missing`);
        }
      });
      const { env, dotenvs } = await this.collectScripts(herarchy, '', filter, envFromCli, _);
      await script2Execute.execute(this.home, this.tln, env, false, dryRun, failOnStderr);
    }
    //
    if (parentFirst) {
      await execSelf();
      await execChildren();
    } else {
      await execChildren();
      await execSelf();
    }
  }

  //
  async run(steps, recursive, depth, filter, { envFromCli, save, dryRun, failOnStderr, depends, _, catalogs, parentFirst }) {
    this.logger.info(`run ${this.uuid} - recursive:'${recursive}' steps:'${steps}' save:'${save}' dryRun:'${dryRun}' depends:'${depends}'`);
    await this.loadDescriptionsFromCatalogs(catalogs);
    const herarchy = await this.unfoldHierarchy(this.uuid, this.id, this.home);
    if (depends) {
      for (const d of Component.getDependsList(herarchy, this.uuid)) {
        await d.component.run(steps, false, 1, filter, { envFromCli, save, dryRun, failOnStderr, depends: false, _, catalogs, parentFirst });
      }
    } else {
      const runChildren = async () => {
        if (recursive && (depth > 1)) {
          await this.buildAllChildren();
          for (const component of this.components) {
            await component.run(steps, recursive, depth - 1, filter, { envFromCli, save, dryRun, failOnStderr, depends, _, catalogs, parentFirst });
          }
        }
      }
      const runSelf = async () => {
        for (const step of steps) {
          let stepId = step;
          let h = herarchy;
          let error = false;
          // check if we need to inject run-time component
          const parts = stepId.split('@');
          if (parts.length > 1) {
            stepId = parts[0];
            const componentId = parts[1];
            error = true;
            for (let component of await this.resolve([componentId])) {
              h = await this.unfoldHierarchy(this.uuid, this.id, this.home, true, await component.unfoldHierarchy(this.uuid, this.id, this.home));
              error = false;
            }
          }
          //
          if (error) {
            this.logger.error(`${step} could not be resolved`);
          } else {
            const { scripts, env, dotenvs } = await this.collectScripts(h, new RegExp(`\^${stepId}\$`), filter, envFromCli, _);
            const skipList = [];
            for (const script of scripts) {
              if (!skipList.includes(script.id)) {
                if (await script.execute(this.home, this.tln, env, save, dryRun, failOnStderr)) {
                  skipList.push(script.id);
                }
              }
            }
          }
        }
      }
      if (parentFirst) {
        await runSelf();
        await runChildren();
      } else {
        await runChildren();
        await runSelf();
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
      try {
      const d = require(configFile);
      d.source = configFile;
      descriptions.push(d);
      } catch (e) {
        this.logger.error(`${configFile} has invalid structure\n`, e.stack);
        process.exit(1);
      }
    }
    return descriptions;
  }

  //
  async loadDescriptionsFromCatalogs(catalogs) {
    const descs = [];
    for (const c of catalogs) {
      const tmpobj = tmp.fileSync();
      const fl = `${tmpobj.name}.conf`;
      const response = await fetch(c);
      fs.writeFileSync(fl, await response.text());
      const d = require(fl);
      d.source = c;
      descs.push(d);
    }
    this.descriptions = descs.concat(this.descriptions);
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
  async find(ids, recursive = true, depth = 0, exclude = [], force = false) {
    let component = null;
    this.logger.trace(`uuid: '${this.uuid}' finds ${ids}`);
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
            const c = await this.buildChild(item, force);
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

  async resolve(components, resolveEmptyToThis = false, popup = true, force = false) {
    let r = [];
    if (components.length) {
      this.logger.debug(`uuid: '${this.uuid}' resolves ${components}`);
      for (let component of components) {
        if (component === '/') {
          r.push(this.getRoot());
        } else {
          // find component
          const c = await this.find(component.split('/'), true, popup ? 0 : 1, [], force);
          if (c) {
            r.push(c);
          } else {
            this.logger.error(`Component '${component}' was not found`);
          }
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
    this.logger.debug(this.logger.getFunctonCallDescription('unfoldHierarchy', { anchor, id, home, unique, list }));
    if (unique) {
      list = list.filter((item) => (item.anchor !== anchor) || (item.component.uuid !== this.uuid) && (item.anchor === anchor));
    }
    list.push({ component: this, anchor, id, home, srcId: this.id });

    // check depends list first
    let depends = [];
    for (const desc of this.descriptions) {
      if (desc.depends) {
        depends = depends.concat(await desc.depends(this.tln));
      }
    }
    for (let component of await this.resolve(depends)) {
      // TODO cover scenarios where current component is not root
      if (/*this.id || */this.isRoot()) {
        this.logger.error(`Component ${this.id} depends on nested component ${component.id}`);
      } else {
        list = await component.unfoldHierarchy(component.uuid, component.id, component.home, unique, list);
      }
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
    return hierarchy
      .filter(c => c.anchor !== anchor)
      .reverse()
      .filter((item, pos, arr) => {
        for (let i = 0; i < arr.length; i++) {
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
    // TODO there should two steps, first unfold all aliases and the collect scripts
    for (const h of hierarchy) {
      (await h.component.findSteps(pattern, filter)).map(i => {
        // collect script from direct parent or inherits list
        if ((h.anchor === this.uuid) && (i.scripts.length)) {
          scripts.push(...i.scripts);
        }
        envs.push({ ...i.envs, id: h.id, home: h.home, anchor: h.anchor, srcId: h.srcId, dotenvs: i.dotenvs.map(de => path.join(h.component.home, de)) });
        dotenvs = dotenvs.concat(i.dotenvs.map(de => path.join(path.relative(this.home, h.component.home), de)));
      });
    }
    // merge all env and apply options
    let env = { ...process.env };
    for (const e of envs.reverse()) {
      // load environment variables from donenv files
      let dotEnv = {};
      for (const de of e.dotenvs) {
        const pe = utils.parseEnvFile(de, this.logger);
        dotEnv = { ...dotEnv, ...pe };
      }
      env = await e.env.build(this.tln, { ...env, TLN_COMPONENT_ID: e.id, TLN_COMPONENT_HOME: e.home, TLN_COMPONENT_SRC_ID: e.srcId, ...dotEnv, ...(await e.options.parse(this.tln, _)) });
    }
    return { scripts, env: { ...env, ...envFromCli, TLN_COMPONENT_ID: this.id, TLN_COMPONENT_HOME: this.home }, dotenvs: dotenvs.reverse() };
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
        // TODO implement protection from cycle references
        const steps = await desc.steps(this.tln);
        const patterns = [pattern];
        while (patterns.length) {
          const id = patterns.shift();
          for (const step of steps) {
            if (step.id.match(id) && filter.validate(step.filter ? step.filter : '')) {
              if (Array.isArray(step.builder)) {
                patterns.push(...(step.builder.map(v => new RegExp(`\^${v}\$`))));
              } else {
                scripts.push(scriptFactory.create(this.logger, step.id, this.uuid, (step.failOnStderr === undefined)?true:step.failOnStderr, step.builder));
              }
            }
          }
        }
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
      r.push({ scripts, envs: { env: env, options: options }, dotenvs });
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
