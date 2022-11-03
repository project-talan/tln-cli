'use strict'

const os = require('os');
const path = require('path');
const fs = require('fs');

const requireFromString = require('require-from-string');
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

  //---------------------------------------------------------------------------
  // utils
  //---------------------------------------------------------------------------
  enumFolders(srcPath, exclude = utils.excluseFolders) {
    let folders = [];
    if (fs.existsSync(srcPath)) {
      fs.readdirSync(srcPath).forEach(name => {
        const p = path.join(srcPath, name);
        try {
          if (fs.lstatSync(p).isDirectory() && exclude.indexOf(name) == -1) {
            folders.push({ name: name, path: p });
          }
        } catch (err) {
          this.logger.trace('Skip folder due to error', p, err);
        }
      });
    }
    // sort result A->Z
    return folders.sort((l, r) => l.name.localeCompare(r.name));
  }

  async resolveComponentsFromDesc(desc) {
    if (!desc.resolved) {
      desc.resolved = {};
      if (desc.components) {
        desc.resolved = await desc.components(this.tln);
      }
    }
    return desc.resolved;
  }


  //---------------------------------------------------------------------------
  // work with descriptions
  //---------------------------------------------------------------------------
  // check if descriptions are not empty and save them inside object
  storeDescriptions(ds) {
    for (const d of ds) {
      if (Object.keys(d).length) {
        this.descriptions.push(d);
      }
    }
  }

  // load description from one file
  loadDescriptionFromFile(srcPath, fileName = utils.configFileName) {
    const configFile = path.join(srcPath, fileName);
    if (fs.existsSync(configFile) && fs.lstatSync(configFile).isFile()) {
      try {
        ///
        //const d = require(configFile);
        const d = requireFromString(fs.readFileSync( configFile, 'utf8' ), configFile);
        if (d.version && d.version === utils.configVersion) {
          d.source = configFile;
          return d;
        }
        this.logger.warn(`${configFile} was skipped due to incompatible config version (required: ${utils.configVersion})`);
      } catch (e) {
        this.logger.error(`${configFile} has invalid structure\n`, e.stack);
        process.exit(1);
      }
    }
    return {};
  }

  // load & merge dscription from config file and all sub-folders
  // should save descriptions
  mergeDescriptionsFromPath(srcPath) {
    const d = this.loadDescriptionFromFile(srcPath);
    // scan folders
    const descs = [];
    for (const folder of this.enumFolders(srcPath)) {
      const desc = this.mergeDescriptionsFromPath(path.join(srcPath, folder.name));
      descs.push({id: folder.name, ...desc});
    }
    d.components = async (tln) => descs;
    return d;
  }
  loadDescriptionsFromPath(srcPath) {
    this.storeDescriptions([this.mergeDescriptionsFromPath(srcPath)]);
  }

  // load descriptions from config folder
  loadDescriptionsFromConfigFolder(srcPath, folderName = utils.configFolderName) {
    this.loadDescriptionsFromFolders(path.join(srcPath, folderName));
  }

  // load descriptions from multiple folders from config folder
  loadDescriptionsFromFolders(srcPath) {
    // enum all sub folders
    for (const folder of this.enumFolders(srcPath)) {
      this.loadDescriptionsFromPath(folder.path);
    }
  }

  // load descriptions from local file and config folder
  // should save descriptions
  loadDescriptions() {
    this.loadDescriptionsFromConfigFolder(this.getHome());
    this.storeDescriptions([this.loadDescriptionFromFile(this.getHome())]);
  }
  
  //---------------------------------------------------------------------------
  // work with child components
  //---------------------------------------------------------------------------
  async createChildFromId(id, force = false) {
  // child component will have home path different from parent
    return await this.createChildFromHome(path.join(this.getHome(), id), force);
  }

  // child component will inherit home hierarchy from parent
  async createChildFromHome(home, force = false) {
    // check if entity was already created
    const id = path.basename(home);
    let c = this.components.find(e => e.getId() === id);
    //
    if (!c) {
      // collect description from already loaded sources
      const ds = [];
      for (const desc of this.descriptions) {
        const cs = await this.resolveComponentsFromDesc(desc);
        //
        if (cs) {
          for (const cId of Object.keys(cs)) {
            if (cId === id) {
              ds.push({ ...cs[cId], source: desc.source });
            }
          }
        }
      }
      // create child entity
      if (utils.isConfigPresent(home) || ds.length || force) {
        c = new component(this.logger, this.tln, id, home, this, ds);
        c.loadDescriptions();
        this.components.push(c);
      }
    }
    return c;
  }

}

module.exports.createRoot = (logger, tln, home, stdCatalog) => {
  const root = new component(logger, tln, '', home, null, []);
  root.loadDescriptionsFromPath(stdCatalog);
  root.loadDescriptions();
  return root;
}
