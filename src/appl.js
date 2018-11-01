
const path = require('path');
const fs = require('fs');
const utils = require('./utils');

class Appl {
  constructor(logger, home) {
    this.logger = logger;
    this.home = home;
    this.root = null;
    this.entity = null;
    //
    let cwd = process.cwd();
    // find local dev env projects root
    let projectsHome = process.env.PROJECTS_HOME;
    if (!projectsHome) {
      // otherwise use current folder as root
      projectsHome = cwd;
    }
    // build chain of entities from projects home to the current folder
    let folders = [];
    if (cwd.startsWith(projectsHome)) {
      const rel = path.relative(projectsHome, cwd);
      if (rel) {
        folders = rel.split(path.sep);
      }
    } else {
      // running tln outside the projects home - use cwd
      projectsHome = cwd;
    }
    this.logger.info(utils.prefix(this, 'constructor'), 'projects home:', projectsHome);
    this.logger.info(utils.prefix(this, 'constructor'), 'cwd:', cwd);
    this.logger.info(utils.prefix(this, 'constructor'), 'folders:', folders);
    //
    this.root = require('./entity').createRoot(projectsHome, '/', this.logger);
    this.root.loadDescsFromSource(this.home);
    this.root.loadDescs();
    //
    this.entity = this.root;
    folders.forEach(function(folder) {
      this.entity = this.entity.dive(folder, true);
    }.bind(this));
    //
    this.logger.trace(utils.prefix(this, 'constructor'), 'root:', utils.quote(this.root.getId()), this.root.descs);
    this.logger.trace(utils.prefix(this, 'constructor'), 'entity:', utils.quote(this.entity.getId()), this.entity.descs);
  }
  //
  resolve(components) {
    this.logger.trace(utils.prefix(this, this.resolve.name), utils.quote(components));
    //
    let r = [];
    let ids = [];
    if (components) {
      ids = components.split(':');
    }
    if (ids.length) {
      ids.forEach(function(id) {
        this.logger.trace(utils.prefix(this, this.resolve.name), 'resolving ', utils.quote(id));
        // try to find inside child components
        let e = this.entity.find(id, true);
        if (!e) {
          // try to use components in parent's child
          this.logger.trace('searching', `'${id}'`, 'using parent');
          e = this.entity.find(id, false, this.entity);
        }
        if (e) {
          r.push(e);
        } else {
          this.logger.warn(`component with id=${id} was not found`);
        }
      }.bind(this));
    } else {
      // resolve to the cwd component
      r.push(this.entity);
    }
    return r;
  }

}

module.exports.create = (logger, home) => {
  return new Appl(logger, home);
}
