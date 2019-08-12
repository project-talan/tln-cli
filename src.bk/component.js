'use strict';

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
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
    let r = [];
    if (this.parent) {
      const pid = this.parent.getUid();
      if (pid) {
          r =  [pid, this.id];
        } else {
          r =  [this.id];
        }
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

  //

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
        // TODO check that we are NOT dive into floatUp child
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
  

  // Collect and combine all environment variables from parents, depends list and component itself
  // goal is to provide complete script execution environment
  // origin - path to component, which requests variables
  // anchor - path to component, which provides variable
  getVariables(vars, origin = null) {
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
    // look into component's descs
    for(const pair of this.descs) {
      if (pair.desc.variables) {
        const v = variables.create(this.getHome(), orig);
        pair.desc.variables(null, v);
        r.push({id: pair.path, vars: v});
      }
    }
    return r;
  }
  
  /**
    *
    * Collect all available steps from component own descriptions, hierarchy of parens and from inherits list
    * Result is two arrays scripts to execute and environment variables
    * @step - step id to execute
    * @filter - define set of rules to filter available steps
    * @home - component current folder
    * @result - object which holds environment varaibles, environment files and collected steps
    * @tail - suffix is used for step uid formation
  */
  findStep(step, filter, home, result, parent = null) {
    this.logger.trace(utils.prefix(this, this.findStep.name), 'searching step', utils.quote(step), 'using home:', utils.quote(home), 'iside', utils.quote(this.getId()));
    let r = result;
    // first lookup inside parents
    if (this.parent && (this.parent != parent)) {
      r = this.parent.findStep(step, filter, home, r);
    }
    let i = -1; // calculate descs count to simplify scripts' names
    for(const pair of this.descs) {
      i++;
      // second, lookup inside inherits list
      if (pair.desc.inherits) {
        for(const inh of pair.desc.inherits()) {
          const e = this.find(inh, false, this);
          if (e) {
            r = e.findStep(step, filter, home, r, e.parent);
          } else {
            this.logger.warn(utils.quote(inh), 'component from inherits list was not resolved for', utils.quote(this.getId()));
          }
        }
      }
      // collect environment files
      let envFiles = [];
      if (pair.desc.dotenvs) {
        envFiles = pair.desc.dotenvs();
      }
      const relativePath = path.relative(home, this.getHome());
      r.envFiles = r.envFiles.concat(envFiles.map((v, i, a) => path.join(relativePath, v)));

      // third, check component's descriptions
      if (pair.desc.steps) {
        // steps' options
        let opts = options.create(this.logger);
        if (pair.desc.options) {
          pair.desc.options(null, opts);
        }
        for(const s of pair.desc.steps()) {
          // is it our step
          if ((s.id === step) || (step === '*')) {
            // are we meet underyling os, version and other filter's restrictions
            if (filter.validate(s)) {
              // check if step was already added
/*               let suffix = [s.id];
              if (i || (home !== this.getHome())) {
                suffix.push(`${i}`);
              }
 */
              const scriptUid = s.id + '@' + this.getUid([`${i}`]);
              const scriptName = s.id + '@' + this.getUid([]);
              if (!r.steps.find( es => es.getUid() === scriptUid )) {
                r.steps.push( script.create(this.logger, { 
                  uid: scriptUid,
                  name: scriptName,
                  options:opts,
                  fn: s.script
                }));
              }
            }
          }
        }
      }
    }
    // collect environment variables
    r.vars = this.getVariables(r.vars);
    return r;
  }

  //
  async execute(steps, filter, recursive, parallel, params) {
    this.logger.trace(utils.prefix(this, this.execute.name), utils.quote(this.getId()), 'component executes', steps);
    // collect steps from descs, interits, parents
    const p = params.clone();
    p.home = this.getHome();
    for(const step of steps) {
      const scope2execute = this.findStep(step, filter, p.home, { vars: [], envFiles: [], steps:[] });
      //
      if (scope2execute.steps.length) {
        // prepare environment
        const env = environment.create(this.logger, p.home, this.getId());
        env.build(scope2execute.vars);
        // TODO merge env & envFiles inside parameters with already existing values
        p.env = env.getEnv();
        p.envFiles = scope2execute.envFiles;
        //
        for(const s of scope2execute.steps.reverse()) {
          if (!! await s.execute(p)) {
            break;
          }
        }
      } else {
        this.logger.debug(utils.quote(step), 'step was not found for', utils.quote(this.getId()), 'component');
      }
    }
    //
    if (recursive) {
      this.construct();
      for(const component of this.components) {
        if (parallel) {
          component.execute(steps, filter, recursive, parallel, params);
        } else {
          await component.execute(steps, filter, recursive, parallel, params);
        }
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
