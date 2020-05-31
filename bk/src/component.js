'use strict'

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
var JSONfn = require('json-fn');

const utils = require('./utils');
const script = require('./script');
const options = require('./options');
const variables = require('./variables');

class Component {
  constructor(logger, tln, home, parent, id, descriptions) {
    this.logger = logger;
    this.tln = tln;
    this.home = home;
    this.parent = parent;
    this.id = id;
    this.uuid = 'tln';
    if (this.parent) {
      this.uuid = [this.parent.uuid, this.id].join('.');
    }
    this.descriptions = descriptions;
    this.components = [];
  }

  /*
  * 
  * params:
  */
  getRoot() {
    if (this.parent) {
      return this.parent.getRoot();
    }
    return this;
  }

  /*
  * 
  * params:
  */
  getUuid(chunks = []) {
    return [this.uuid].concat(chunks).join('.');
  }

  /*
  * Init component description from file or git repository
  * params:
  */
  initConfiguration(options) {
    if (options.repo) {
      // clone repo with tln configuration
      const folder = utils.getConfFolder(this.home);
      if (fs.existsSync(folder)) {
        this.logger.warn(`Git repository with tln configuration already exists '${folder}'. Use git pull to update it`);
      } else {
        this.logger.con(execSync(`git clone ${options.repo} ${utils.tlnFolderName}`).toString());
      }
    } else {
      // generate local configuration file
      const fileName = utils.getConfFile(this.home);
      const fe = fs.existsSync(fileName);
      let generateFile = true;
      if (fe && !options.force) {
        this.logger.error(`Configuration file already exists '${fileName}', use --force to override`);
        generateFile = false;
      }
      if (generateFile) {
        const templateFileName = path.join(__dirname, utils.tlnConfTemplate);
        if (options.lightweight) {
          const reg = /\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm;
          fs.writeFileSync(fileName, fs.readFileSync(templateFileName).toString().replace(reg, ''));
          this.logger.con('done');
        } else {
          fs.copyFile(templateFileName, fileName, (err) => {
            if (err) {
              this.logger.error(err);
            } else {
              this.logger.con('done');
            }
          });
        }
      }
    }
  }

  /*
  * Update component description inside .tln folder
  * params:
  */
  updateConfiguration(options) {
    const folder = utils.getConfFolder(this.home);
    if (!fs.existsSync(folder)) {
      this.logger.warn(`Git repository with tln configuration does not exist '${folder}', use 'init-config' command first.`);
    } else {
      this.logger.con(execSync(`pushd ${folder} && git pull origin master && popd`).toString());
    }
  }

  enumFolders(location) {
    let ids = [];
    fs.readdirSync(location).forEach(name => {
      const p = path.join(location, name);
      try {
        if (fs.lstatSync(p).isDirectory() && ['.git', '.tln'].indexOf(name) == -1) {
          ids.push(name);
        }
      } catch (err) {
        this.logger.trace('Skip folder due to access restruction', p);
      }
    });
    return ids;
  };

  /*
  * Recursively scan input folder and mege all available descriptions
  * params:
  */
  mergeDescs(location, recursive) {
    let desc = null;
    // load definitions from .tln.conf file
    const conf = utils.getConfFile(location);
    if (fs.existsSync(conf) && fs.lstatSync(conf).isFile()) {
      //
      desc = require(conf);
      /*/
      const d = require(conf);
      desc = JSONfn.clone(d);
      delete require.cache[require.resolve(conf)];
      /*/
    }
    if (recursive) {
      // enum folders recursively and merge all description information all together
      if (!desc) {
        desc = {};
      }
      //
      let components = [];
      if (desc.components) {
        components = desc.components();
      }
      //
      this.enumFolders(location).forEach((folder) => {
        let component = this.mergeDescs(path.join(location, folder), recursive);
        const i = components.findIndex(function (c) { return c.id === folder; });
        if (i >= 0) {
          // merge descs
          this.logger.fatal('recursive merge of folders is not implemented');
        } else {
          // add
          component.id = folder
          components.push(component);
        }
      });
      // reassign
      desc.components = function () { return components; };
    }
    return desc;
  }

  /*
  *
  * params:
  */
  buildDescriptionPair(source, destination, description) {
    return { source: source, destination: destination, description: description };
  }

  /*
  *
  * params:
  */
  loadDescriptions() {
    this.loadDescriptionsFromFolder(this.home, this.home);
    this.loadDescriptionsFromFile(this.home, this.home, false);
  }

  /*
  *
  * params:
  */
  loadDescriptionsFromFile(location, destination, recursive) {
    let description = this.mergeDescs(location, recursive);
    if (description) {
      this.descriptions.push(this.buildDescriptionPair(location, destination, description));
    }
  }

  /*
  *
  * params:
  */
  loadDescriptionsFromFolder(location, destination, folder) {
    // add additional source from .tln folder with git repository
    const confDir = utils.getConfFolder(location, folder);
    if (fs.existsSync(confDir)) {
      this.loadDescriptionsFromFile(confDir, destination, true);
    }
  }

  isItMe(component) {
    return ((this.id === component.id) && (this.home === component.home));
  }

  /*
  * Find entity inside children or pop up to check parent and continue search there
  * params:
  */
  find(parts, strictSearch, floatUp = null) {
    let component = null;
    if (parts.length) {
      const id = parts[0];
      if (this.id === id) {
        component = this;
      } else {
        // check if requested entity was already created or can be created
        component = this.dive(id, false);
        if (component) {
          // should we dive deeper
          if (parts.length > 1) {
            component = component.find(parts.slice(1), strictSearch);
          }
        } else {
          if (!strictSearch) {
            const ids = this.getIDs();
            //
            ids.find((item) => {
              const c = this.dive(item, false);
              if (c && (!floatUp || (floatUp && !floatUp.isItMe(c)))) {
                component = c.find(parts.slice(), strictSearch);
              }
              return (component != null);
            });
          }
          // let's try to search at one level upper
          if (floatUp && this.parent) {
            component = this.parent.find(parts.slice(), strictSearch, this);
          }
        }
      }
    }
    return component;
  }


  /*
  * Find corresponding component for every ID from array
  * params:
  */
  resolve(ids, resolveEmptyToThis = false) {
    let result = [];
    if (ids.length) {
      ids.forEach((id) => {
        let component = this;
        // split id into elements, identify is it absulute path, relative or just standalone id
        let parts = id.split('/');
        if (id === '/') {
          parts = ['', '/']
        }
        let strictSearch = true;
        if (parts.length > 1) {
          if (parts[0]) {
            // relative path
          } else {
            // absolute path
            component = this.getRoot();
            parts.shift();
          }
        } else {
          // standalone id
          strictSearch = false;
        }
        // try to find inside child components
        let e = component.find(parts, strictSearch);
        if (!(e || strictSearch)) {
          // try to use components in parent's child
          e = component.find(parts, strictSearch, component);
        }
        //
        if (e) {
          result.push(e);
        } else {
          this.logger.warn('component with id: [', id, '] was not found');
        }
      });
    } else {
      // resolve to the current folder component
      if (resolveEmptyToThis) {
        result.push(this);
      }
    }
    return result;
  }


  /*
  * Print all information about component
  * params:
  */
  inspectComponent(filter, cntx, yaml, cout) {
    let r = {};
    r.id = this.id;
    r.uuid = this.uuid;
    r.home = this.home;
    //r.uuid = this.uuid;
    r.parent = (this.parent) ? (this.parent.id) : (null);
    r.descriptions = [];
    this.descriptions.forEach(description => {
      r.descriptions.push({ source: description.source, destination: description.destination });
    });
    //
    r.tags = [];
    r.inherits = [];
    r.depends = [];
    //
    const steps = this.findStep('*', filter, this.home, cntx, [], r.inherits);
    //
    r.env = {};
    const { vars/*, env*/ } = this.buildEnvironment(this.getVariables([], r.depends));
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
    //
    if (yaml) {
      cout((require('yaml')).stringify(r));
    } else {
      cout(JSON.stringify(r, null, 2));
    }
  }

  /*
  * Create one child component, based on description and | or information from folders
  * params:
  */
  dive(id, force, home = null) {
    // check if entity was already created
    let component = this.components.find((c) => { return c.id === id; });
    //
    if (!component) {
      // collect description from already loaded sources
      const descriptions = [];
      this.descriptions.forEach((d) => {
        let components = [];
        if (d.description.components) {
          components = d.description.components();
        }
        //
        const component = components.find((c) => { return c.id === id; });
        if (component) {
          descriptions.push(this.buildDescriptionPair(d.source, d.destination, component));
        }
      });
      // create child entity, should we get home from description?
      const eh = path.join((home) ? (home) : (this.home), id);
      if (utils.isConfPresent(eh) || descriptions.length || force) {
        component = new Component(this.logger, this.tln, eh, this, id, descriptions);
        component.loadDescriptions();
        this.components.push(component);
      }
    }
    return component;
  }

  /*
  * Create one child component, using different from the arent home folder
  * params:
  */
  createChild(home, force) {
    return this.dive(path.basename(home), force, path.dirname(home));
  }

  /*
  * Collect list of childs using all possible sources: descriptions, file system
  * params:
  */
  getIDs() {
    // collect ids
    let ids = [];
    // ... from already created components
    this.components.forEach((c) => { ids.push(c.id); });
    // ... from descs
    this.descriptions.forEach((d) => {
      let components = [];
      if (d.description.components) {
        components = d.description.components();
      }
      //
      components.forEach(function (c) {
        ids.push(c.id);
      });
    });
    // ... from file system
    if (fs.existsSync(this.home)) {
      ids = ids.concat(this.enumFolders(this.home));
    }
    // remove duplicates
    ids = utils.uniquea(ids);
    this.logger.trace('ids', ids);
    return ids;
  }

  /*
  * Create all children components from available descriptions
  * params:
  */
  construct() {
    this.getIDs().forEach((id) => {
      this.dive(id, false);
    });
  }


  /**
   * Collect and combine all environment variables from parents, depends list and component itself
   * goal is to provide complete script execution environment
   * @var - array of collecting variables
   * @origin - path to component, which requests variables
 */
  getVariables(vars = [], depends = [], origin = null) {
    let orig = origin;
    if (!orig) {
      orig = this.home;
    }
    let r = vars;
    // get variables form hierarchy of parents
    if (this.parent) {
      depends.push(this.parent.id);
      r = this.parent.getVariables(r, depends, orig);
    }
    // for each depends list
    for (const d of this.descriptions) {
      if (d.description.depends) {
        const dependsComponents = this.resolve(d.description.depends());
        for (const component of dependsComponents) {
          depends.push(component.id);
          r = component.getVariables(r, depends);
        }
      }
    }
    // look into component's descs
    for (const d of this.descriptions) {
      if (d.description.variables) {
        const v = variables.create(this.home, orig);
        d.description.variables(this.tln, v);
        r.push({ source: d.source, vars: v });
      }
    }
    return r;
  }

  /**
   * @variables - 
 */
  buildEnvironment(variables) {
    let names = [];
    let env = { ...process.env };
    //
    env['COMPONENT_HOME'] = this.home;
    env['COMPONENT_ID'] = this.id;
    for (const v of variables.reverse()) {
      names = v.vars.names(names);
      env = v.vars.build(this.tln, env);
    }
    //
    let r = {};
    names.forEach(n => {
      r[n] = env[n];
    })
    return { vars: r, env: env };
  }


  /*
  * Print hierarchy of components
  * params:
  */
  print(cout, depth, offset = '', last = false) {
    // output yourself
    let status = '';
    if (!fs.existsSync(this.home)) {
      status = '*'
    }
    cout(`${offset} ${this.id} ${status}`);
    //
    if (depth !== 0) {
      this.construct();
      let cnt = this.components.length;
      let no = offset;
      if (offset.length) {
        if (this.components.length) {
          no = offset.substring(0, offset.length - 1) + '│';
        }
        if (last) {
          no = offset.substring(0, offset.length - 1) + ' ';
        }
      }
      this.components.forEach(function (entity) {
        cnt--;
        const delim = (cnt) ? (' ├') : (' └');
        entity.print(cout, depth - 1, `${no}${delim}`, cnt === 0);
      });
    }
  }

  /*
  * Execute shell command from string or from input file
  * params:
  */
  async execute(command, file, recursive, cntx) {
    if (fs.existsSync(this.home)) {
      if (recursive) {
        this.construct();
        for (const component of this.components) {
          await component.execute(command, file, recursive, cntx.clone());
        }
      }
      // TODO: collect environment variables and dotenvs
      const scriptToExecute = script.create(this.logger, this.uuid, this.id, null, (tln, s) => {
        if (command) {
          s.set([command]);
        } else if (file) {
          s.set(file)
        } else this.logger.warn(`${this.uuid} exec command input parameter is missing`);
      });
      const {/*vars, */env } = this.buildEnvironment(this.getVariables());
      await scriptToExecute.execute(this.home, cntx, this.tln, env);
    }
  }

  /**
    *
    * Collect all available steps from component own descriptions, hierarchy of parens and from inherits list
    * Result is array of scripts and contexts
    * @step - step id to execute
    * @filter - aims to gather subset of steps 
    * @home - component current folder
    * @cntx - execution context
    * @result - object which holds environment varaibles, environment files and collected steps
    * @inherits -
    * @explicit - find step inside specific component, defined by this parameter
    * @parent - parameter is used to prevent add step from component more than one time
  */
  findStep(step, filter, home, cntx, result, inherits, explicit = null, parent = null) {
    let r = result;
    // collect environment files
    for (const d of this.descriptions) {
      if (d.description.dotenvs) {
        const relativePath = path.relative(home, this.home);
        cntx.addDotenvs(d.description.dotenvs(this.tln).map((v, i, a) => path.join(relativePath, v)));
      }
    }
    if (explicit) {
      // use explicitly defined component
      r = explicit.findStep(step, filter, home, cntx.attach(), [], []);
    } else {
      // first lookup inside parents
      if (this.parent && (this.parent != parent)) {
        inherits.push(this.parent.id);
        r = this.parent.findStep(step, filter, home, cntx.cloneAsChild(), r, inherits);
      }
      let i = -1; // calculate descs count to simplify scripts' names
      for (const d of this.descriptions) {
        i++;
        // second, lookup inside inherits list
        if (d.description.inherits) {
          const inheritComponents = this.resolve(d.description.inherits());
          for (const component of inheritComponents) {
            inherits.push(component.id);
            r = component.findStep(step, filter, home, cntx.attach(), r, inherits, null, component.parent);
          }
        }
        // third, check component's descriptions
        if (d.description.steps) {
          // steps' options
          let opts = options.create(this.logger);
          if (d.description.options) {
            d.description.options(this.tln, opts);
          }
          for (const s of d.description.steps()) {
            // is it our step
            if ((s.id === step) || (step === '*')) {
              // are we meet underyling os, version and other filter's restrictions
              if (filter.validate(s.filter)) {
                // check if step was already added
                /*               let suffix = [s.id];
                            if (i || (home !== this.getHome())) {
                              suffix.push(`${i}`);
                            }
                */
                const scriptUuid = s.id + '@' + this.getUuid([`${i}`]);
                const scriptName = s.id + '@' + this.getUuid([]);
                if (!r.find(es => es.script.uuid === scriptUuid)) {
                  r.push(
                    {
                      script: script.create(this.logger, scriptUuid, scriptName, opts, s.script),
                      cntx: cntx.detach(inherits),
                    });
                }
              }
            }
          }
        }
      }
    }
    return r;
  }

  /**
   * Run step based on information from descriptions
   * params:
  */
  async run(steps, filter, recursive, cntx) {
    //
    if (recursive) {
      this.construct();
      for (const component of this.components) {
        const c = cntx.clone();
        if (/*parallel*/false) {
          component.run(steps, filter, false, c);
        } else {
          await component.run(steps, filter, false, c);
        }
      }
    } else {
      // collect steps from descs, interits, parents
      for (const step of steps) {
        let s = step;
        let c = null;
        const parts = step.split('@');
        if (parts.length > 1) {
          s = parts[0];
          const cs = this.resolve([parts[1]]);
          if (cs.length) {
            c = cs[0];
          }
        }
        const list2execute = this.findStep(s, filter, this.home, cntx.clone(), [], [], c);
        const {/*vars, */env } = this.buildEnvironment(this.getVariables());
        //
        if (list2execute.length) {
          for (const item of list2execute) {
            if (!! await item.script.execute(this.home, item.cntx, this.tln, env)) {
              break;
            }
          }
        } else {
          this.logger.con(`Nothing to execute`);
        }
      }
    }
  }

  /**
   * Run steps for component and for all components from depends list - unfold environment
   * params:
  */
  async unfold(steps, filter, recursive, cntx) {
    // check parents hierarchy
    if (this.parent) {
      await this.parent.unfold(steps, filter, recursive, cntx.clone());
    }
    // ?????????? should we check inherits list too
    // for each depends list
    for (const d of this.descriptions) {
      if (d.description.depends) {
        const dependsComponents = this.resolve(d.description.depends());
        for (const component of dependsComponents) {
          await component.unfold(steps, filter, recursive, cntx.clone());
        }
      }
    }
    // ??????? should we execute the same step inside component
    await this.run(steps, filter, recursive, cntx);
  }
}

module.exports.createRoot = (logger, tln, home, presetsSrc, presetsDest) => {
  const root = new Component(logger, tln, home, null, '/', []);
  root.loadDescriptionsFromFolder(presetsSrc, presetsDest, 'presets');
  root.loadDescriptions();
  return root;
}
module.exports.create = (logger, tln, home, parent, id, descriptions) => {
  return new Component(logger, tln, home, parent, id, descriptions);
}