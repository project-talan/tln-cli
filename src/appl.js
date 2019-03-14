'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const lsbRelease = require('lsb-release');

const utils = require('./utils');
const filter = require('./filter');

class Appl {
  constructor(logger, home) {
    this.logger = logger;
    this.home = home;
    this.root = null;
    this.component = null;
    //
    let cwd = process.cwd();
    // find local dev env projects root
    let projectsHome = process.env.PROJECTS_HOME;
    if (!projectsHome) {
      // otherwise use current folder as root
      projectsHome = cwd;
    }
    // build chain of components from projects home to the current folder
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
    this.logger.info(utils.prefix(this, 'constructor'), 'operating system', utils.quote(os.type()), utils.quote(os.platform()), utils.quote(os.release()));
    this.logger.info(utils.prefix(this, 'constructor'), 'projects home:', projectsHome);
    this.logger.info(utils.prefix(this, 'constructor'), 'cwd:', cwd);
    this.logger.info(utils.prefix(this, 'constructor'), 'folders:', folders);
    //
    this.root = require('./component').createRoot(projectsHome, '/', this.logger);
    this.logger.trace('catalog folder', this.home);
    this.root.loadDescsFromFolder(this.home, 'presets');
    this.root.loadDescs();
    //
    this.component = this.root;
    folders.forEach(function(folder) {
      this.component = this.component.dive(folder, true);
    }.bind(this));
    //
    this.logger.trace(utils.prefix(this, 'constructor'), 'root component:', utils.quote(this.root.getId()), this.root.descs);
    this.logger.trace(utils.prefix(this, 'constructor'), 'current component:', utils.quote(this.component.getId()), this.component.descs);
  }

  //
  configure() {
    return new Promise( (resolve, reject) => {
      lsbRelease( (_, data) => {
        data.os = os.type();
        data.platform = os.platform();
        data.version = os.release();
        //
        this.logger.trace(utils.prefix(this, 'configure'), 'filter string:', data);
        resolve(filter.create(this.logger, data));
      });
    });
  }

  // function is used during initial components lookup from command line parameter
  // components are colon separated string of ids (paths)
  // every id can be
  // (1) exact component id, like git:        will be looked inside child hierarchy of current component
  // (2) absolute path /java/openjdk-11.0.2:  lookup will start from root component
  // (2) relative path static/html:           the same as (1)
  resolve(components) {
    this.logger.trace(utils.prefix(this, this.resolve.name), utils.quote(components));
    //
    let r = [];
    let ids = [];
    if (components) {
      ids = components.split(':');
    }
    if (ids.length) {
      ids.forEach( (id) => {
        // split id into elements, identify is it absulute path
        this.logger.trace(utils.prefix(this, this.resolve.name), 'resolving ', utils.quote(id));
        // try to find inside child components
        let e = this.component.find(id, true);
        if (!e) {
          // try to use components in parent's child
          this.logger.trace('searching', `'${id}'`, 'using parent');
          e = this.component.find(id, true, this.component);
        }
        if (e) {
          r.push(e);
        } else {
          this.logger.warn('component with id', utils.quote(id), 'was not found');
        }
      } );
    } else {
      // resolve to the current folder component
      r.push(this.component);
    }
    return r;
  }
  //
  initComponentDescription(repo, force) {
    this.logger.trace(utils.prefix(this, this.initComponentDescription.name), utils.quote(repo), force);
    if (repo) {
      // clone repo with tln configuration
    } else {
      // generate local configuration file
      const fileName = this.component.getConfFile(this.component.getHome());
      const fe = fs.existsSync(fileName);
      let generateFile = true;
      if (fe && !force) {
        this.logger.error(`Configuration file already exists '${fileName}', use --force to override`);
        generateFile = false;
      }
      if (generateFile) {
        const template = [
          'module.exports = {',
          '  tags: () => [],',
          '  options: () => [],',
          '  inherits: () => [],',
          '  depends: () => [],',
          '  variables: () => [],',
          '  steps: () => [],',
          '  components: () => []',
          '}'
        ];
        fs.writeFileSync(fileName, template.join('\n'));
        this.logger.con(template);
      }
    }
  
    /*
    this.logger.con(this.component.getId(), repo, force);
        const eh = path.join(this.getHome(), id);
        if (fs.existsSync(this.getConfFile(eh)) || fs.existsSync(this.getConfFolder(eh)) || descs.length || force) {
    */

  }

}

module.exports.create = (logger, home) => {
  return new Appl(logger, home);
}
