'use strict';

const path = require('path');
const fs = require('fs');
const environment = require('./environment');
const variables = require('./variables');
const options = require('./options');
const script = require('./script');
const utils = require('./utils');

class Component {
  constructor(parent, id, name, home, descs, logger) {

    this.parent = parent;
    this.id = id;
    this.name = name;
    this.home = home;
    this.descs = descs;
    this.logger = logger;

    this.tags = [];
    this.inherits = [];
    this.depends = [];
    this.steps = {};
    this.components = [];
  }
  //
  getId() {
    return this.id;
  }
  //
  getName() {
    return this.name;
  }
  //
  getUid(chunks = []) {
    let r = ['tln'];
    if (this.parent) {
      r =  [this.parent.getUid(), this.id];
    }
    return r.concat(chunks).join('.');
  }
  //
  getHome() {
    return this.home;
  }
  //
  isItMe(e) {
    return ((this.getId() === e.getId()) && (this.getHome() === e.getHome()));
  }
  //
  print(cout, depth, offset = '', last = false) {
    // output yourself
    let status = '';
    if (!fs.existsSync(this.getHome())) {
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
      this.components.forEach(function(entity) {
        cnt--;
        const delim = (cnt)?(' ├'):(' └');
        entity.print(cout, depth-1, `${no}${delim}`, cnt === 0);
      });
    }
  }

  // print all information about component
  // TODO: list all possible steps
  inspect(cout) {
    cout(`id: ${this.id}`);
    cout(`home: ${this.home}`);
    cout('uid: ' + this.getUid());
    cout('parent:', (this.parent)?(this.parent.getId()):('none'));
    cout('descs:');
    this.descs.forEach( pair => {
      cout(`  - ${pair.path}`);
    });
    cout('tags:');
    cout('inherits:');
    cout('depends:');
    cout('env:');
    const vars = environment.create(this.logger, this.home).build(this.getVariables([]))
    for(let v in vars) {
      cout(`  - ${v}:${vars[v]}`);
    }
  }
  //
  buildDescPair(source, desc) {
    return { path: source, desc: desc };
  }
  //
  getConfFile(source) {
    return path.join(source, '.tln.conf');
  }
  //
  getConfFolder(source, folder = '.tln') {
    return path.join(source, folder);
  }
  //
  enumFolders(h) {
    let ids = [];
    fs.readdirSync(h).
    forEach(function(name) {
      const p = path.join(h, name);
      if (fs.lstatSync(p).isDirectory() && ['.git', '.tln'].indexOf(name) == -1 ) {
        ids.push(name);
      }
    });
    return ids;
  };
  //
  loadDescs() {
    this.loadDescsFromFolder(this.getHome());
    this.loadDescsFromFile(this.getHome(), false);
  }

  // recursively scan input folder and mege all available descriptions
  mergeDescs(location, scan) {
    let desc = null;
    // load definitions from .tln.conf file
    const conf = this.getConfFile(location);
    if (fs.existsSync(conf)) {
      desc = require(conf);
    }
    if (scan) {
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
      const folders = this.enumFolders(location);
      folders.forEach(function(folder) {
        let component = this.mergeDescs(path.join(location, folder), scan);
        const i = components.findIndex(function (c) { return c.id === folder; });
        if (i >=0 ) {
          // merge descs
          this.logger.fatal('recursive merge of folders is not implemented');
        } else {
          // add
          component.id = folder
          components.push(component);
        }

      }.bind(this));
      // reassign
      desc.components = function(){ return components; };
    }
    return desc;
  }

  //
  loadDescsFromFile(location, scan) {
    let desc = this.mergeDescs(location, scan);
    if (desc) {
      this.descs.push(this.buildDescPair(location, desc));
    }
  }

  //
  loadDescsFromFolder(location, folder = '.tln') {
    // add additional source from .tln folder with git repository
    const confDir = this.getConfFolder(location, folder);
    if (fs.existsSync(confDir)) {
      this.loadDescsFromFile(confDir, true);
    }
  }

  //
  getIDs() {
    // collect ids
    let ids = [];
    // ... from already created components
    this.components.forEach(function (e) { ids.push(e.getId()); });
    // ... from descs
    this.descs.forEach(function(pair) {
      let ents = [];
      if (pair.desc.components) {
        ents = pair.desc.components();
      }
      //
      ents.forEach(function(e) {
        ids.push(e.id);
      });
    }.bind(this));
    // ... from file system
    if (fs.existsSync(this.getHome())) {
      ids = ids.concat(this.enumFolders(this.getHome()));
    }
    // remove duplicates
    ids = utils.uniquea(ids);
    this.logger.trace('ids', ids);
    return ids;
  }

  // create all children from available descriptions
  construct() {
    this.getIDs().forEach(function(id) {
      this.dive(id, false);
    }.bind(this));
  }

  // find entity inside children or pop up to check parent and continue search there
  find(id, recursive, floatUp = null){
    this.logger.trace(utils.prefix(this, this.find.name), 'searching', utils.quote(id), 'inside', utils.quote(this.getId()), (floatUp)?'using parent':'within children');
    let entity = null;
    if (this.getId() === id) {
      entity = this;
    } else {
      // check if requested entity was already created or can be created
      entity = this.dive(id, false);
      if (!entity && recursive) {
        const ids = this.getIDs();
        this.logger.trace('collected ids', ids);
        //
        ids.find(function(item) {
          const e = this.dive(item, false);
          if (e && !this.isItMe(e)) {
            entity = e.find(id, recursive, null);
          }
          return (entity != null);
        }.bind(this));
      }
      //
      if (floatUp && this.parent) {
        entity = this.parent.find(id, recursive, this);
      }
    }
    return entity;
  }
  
  dive(id, force) {
    // check if entity was already created
    let component = this.components.find( (c) => { return c.getId() === id; });
    if (!component) {
      // collect description from already loaded sources
      const descs = [];
      this.descs.forEach( (pair) => {
        let components = [];
        if (pair.desc.components) {
          components = pair.desc.components();
        }
        //
        const component = components.find( (c) => { return c.id === id; });
        if (component) {
          descs.push(this.buildDescPair(pair.path, component));
        }
      });
      // create child entity
      // TODO find more elegant solution
      if (id !== '/') {
        const eh = path.join(this.getHome(), id);
        if (fs.existsSync(this.getConfFile(eh)) || fs.existsSync(this.getConfFolder(eh)) || descs.length || force) {
          component = new Component(this, id, id, eh, descs, this.logger);
          component.loadDescs();
          this.components.push(component);
        }
      }
    }
    return component;
  }

  /*/ build component environment variables
  env(names = []) {
    let r = {};
    const vars = [];
    // construct vars, collect names
    this.descs.forEach(function(pair) {
      if (pair.desc.variables) {
        const v = variables.create();
        v.register(pair.desc.variables());
        names = v.names(names);
        vars.push(v);
      }
    }.bind(this));
    //
    if (this.parent) {
      r = this.parent.env(names);
    } else {
      names.forEach(function(n){
        r[n] = process.env[n];
      });
    }
    r['COMPONENT_HOME'] = this.getHome();
    vars.forEach(function(v){
      r = v.build(r);
    });
    //
    return r;
  }
  /*/

  // Collect and combine all environment variables from parents, depends list and component itself
  // goal is to provide complete script execution environment
  getVariables(vars, origin = null, descId = null) {
    let orig = origin;
    if (!orig) {
      orig = this.getHome();
    }
    let r = vars;
    // get variables form hierarchy of parents
    if (this.parent) {
      r = this.parent.getVariables(r, orig);
    }
    // for each depends list
    for(const pair of this.descs) {
      if (pair.desc.depends) {
        let dpnds = pair.desc.depends();
        for(const dpn of dpnds) {
          const e = this.find(dpn, true, this);
          if (e) {
            r = e.getVariables(r);
          } else {
            this.logger.warn(utils.quote(dpn), 'component from depends list was not resolved for', utils.quote(this.getId()));
          }
        }
      }
    }
    // look into componet's descs
    for(const pair of this.descs) {
      if (!descId || (descId && (descId === pair.path))) {
        if (!r.find(e => e.id === descId)) {
          if (pair.desc.variables) {
            const v = variables.create(this.getHome(), orig);
            v.register(pair.desc.variables());
            r.push({id: pair.path, vars: v});
          }
        }
      }
    }
    return r;
  }

  // Collect all available steps from component own descriptions, hierarchy of parens and from inherits list
  // Result is two arrays scripts to execute and environment variables
  findStep(step, filter, home, res, tail) {
    let r = res;
    // first lookup inside parents
    if (this.parent) {
      r = this.parent.findStep(step, filter, home, res, [this.parent.getName()].concat(tail));
    }
    // second, lookup inside inherits list
    for(const pair of this.descs) {
      if (pair.desc.inherits) {
        let inhs = pair.desc.inherits();
        for(const inh of inhs) {
          const e = this.find(inh, false, this);
          if (e) {
            r = e.findStep(step, filter, home, r, [this.getId()].concat(tail));
          } else {
            this.logger.warn(utils.quote(inh), 'component from inherits list was not resolved for', utils.quote(this.getId()));
          }
        }
      }
    }
    // third, check component's descriptions
    let i = -1; // calculate descs count to simplify scipts' names
    for(const pair of this.descs) {
      if (pair.desc.steps) {
        // environment variables
        r.vars = this.getVariables(r.vars, null, pair.path); // ???? Should it be null
        // environment files
        let envFiles = [];
        if (pair.desc.envs) {
          envFiles = pair.desc.envs();
        }
        // steps' options
        let opts = options.create(this.logger);
        if (pair.desc.options) {
          opts = options.create(this.logger, pair.desc.options());
        }
        pair.desc.steps().forEach( s => {
          // is it our step
          if ((s.id === step) || (step === '*')) {
            // are we meet underyling os, version and other filter's restrictions
            if (filter.validate(s)) {
              // check if step was already added
              i++;
              let suffix = [step];
              if (i || (home !== this.getHome())) {
                suffix.push(`${i}`);
              }
              let scriptUid = this.getUid(suffix);
              if (!r.steps.find( es => es.getUid() === scriptUid )) {
                r.steps.push( script.create(this.logger, { 
                  uid: scriptUid,
                  name: (tail.concat(suffix)).join('.'),
                  options:opts,
                  envFiles: envFiles,
                  fn: s.script
                }));
              } else {
              }
            }
          }
        });
      }
    }
    return r;
  }
  //
  async execute(steps, filter, save, skip, argv) {
    this.logger.trace(utils.prefix(this, this.execute.name), utils.quote(this.getId()), 'component executes', steps);
    // collect steps from descs, interits, parents
    for(const step of steps) {
      const home = this.getHome();
      const scope2execute = this.findStep(step, filter, home, { vars: [], steps:[] }, []);
      //
      if (scope2execute.steps.length) {
        // prepare environment
        const env = environment.create(this.logger, this.home);
        env.build(scope2execute.vars);
        //
        for(const s of scope2execute.steps) {
          await s.execute(home, { save: save, skip: skip, argv: argv, env: env.getEnv() });
        }
      } else {
        this.logger.warn(utils.quote(step), 'step was not found for', utils.quote(this.getId()), 'component');
      }
    }
  }

}

// TODO re-arrange parameters logger, id, home, descs
module.exports.createRoot = (home, id, logger) => {
  return new Component(null, id, 'tln', home, [], logger);
}

module.exports.create = (parent, id, descs, logger) => {
  return new Component(parent, id, id, path.join(parent.getHome(), id), descs, logger);
}
