'use strict'

const os = require('os');
const path = require('path');
const fs = require('fs');

const utils = require('./utils');

class component {
  constructor(logger, tln, id, home, parent, descriptions) {
    this.logger = logger;
    this.tln = tln;
    this.id = id;
    this.home = home;
    this.parent = parent;
    this.uuid = '';
    if (this.parent) {
      this.uuid = [this.parent.getUuid()].concat([this.id]).join('/');
    }
    this.descriptions = descriptions;
    this.components = [];
  }

  getId() {
    return this.id;
  }

  getUuid() {
    return this.uuid;
  }

  getHome() {
    return this.home;
  }

  getParent() {
    return this.parent;
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



  async createChildFromId(id, force) {
  // child component will have home path different from parent
    return await this.createChildFromHome(path.join(home, id), force);
  }

  // child component will inherit home hierarchy from parent
  async createChildFromHome(home, force) {
    // check if entity was already created
    const id = path.basename(home);
    let c = this.components.find(e => e.getId() === id);
    //
    if (!c) {
      // collect description from already loaded sources
      const descriptions = [];
/*
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
*/
      // create child entity
      const cHome = (home) ? (home) : path.join((this.home), id);
      if (/*utils.isConfigPresent(cHome) || */descriptions.length || force) {
        c = new component(this.logger, this.tln, id, cHome, this, descriptions);
//        component.loadDescriptions();
        this.components.push(c);
      }
    }
    return c;
  }


}

module.exports.createRoot = (logger, tln, home, stdCatalog) => {
  const root = new component(logger, tln, '', home, null, []);
  return root;
}
