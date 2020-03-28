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

  //
  async ls(depth) {
    this.logger.con(this.id);
  }

  //
  async exec(recursive, command, input) {
    this.logger.con(this);
  }

  //
  async run(recursive, save, dryRun, depends) {
    this.logger.con('!!!!!!!!!!!!!!1');
    this.logger.con(this);
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
