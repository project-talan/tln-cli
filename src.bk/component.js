'use strict';

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const environment = require('./environment');
const variables = require('./variables');
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
  //
  getHome() {
    return this.home;
  }
  //

  

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
  


}

// TODO re-arrange parameters logger, id, home, descs
module.exports.createRoot = (home, id, logger) => {
  return new Component(null, id, 'tln', home, [], logger);
}

module.exports.create = (parent, id, descs, logger) => {
  return new Component(parent, id, id, path.join(parent.getHome(), id), descs, logger);
}
