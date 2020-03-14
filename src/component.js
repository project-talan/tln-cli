'use strict'

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
var JSONfn = require('json-fn');

class Component {
  constructor(logger, id, home, parent, descriptions) {
    this.logger = logger;
    this.uuid = '~';
    this.id = id;
    this.home = home;
    this.parent = parent;
    if (this.parent) {
      this.uuid = [this.parent.uuid, this.id].join('/');
    }
    this.descriptions = descriptions;
    this.components = [];
  }

}

module.exports.createRoot = (logger, tln, home, source, destination) => {
  const root = new Component(logger, tln, home, null, '/', []);
  root.loadDescriptionsFromFolder(source, destination, 'presets');
  root.loadDescriptions();
  return root;
}

module.exports.create = (logger, id, home, parent, descriptions) => {
  return new Component(logger, id, home, parent, descriptions);
}
