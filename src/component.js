'use strict';

const path = require('path');
const fs = require('fs');

class Component {
  constructor(logger, home, parent, id, descs) {
  }

  /*
  * Init component description from file or git repository
  * params:
  */
  initConfiguration(options) {
    /*
    if (repo) {
      // clone repo with tln configuration
      const folder = utils.getConfFolder(this.getHome());
      if (fs.existsSync(folder)) {
        this.logger.warn(`Git repository with tln configuration already exists '${folder}'. Use git pull to update it`);
      } else {
        this.logger.con(execSync(`git clone ${repo} ${utils.tlnFolderName}`).toString());
      }
    } else {
      // generate local configuration file
      const fileName = utils.getConfFile(this.getHome());
      const fe = fs.existsSync(fileName);
      let generateFile = true;
      if (fe && !force) {
        this.logger.error(`Configuration file already exists '${fileName}', use --force to override`);
        generateFile = false;
      }
      if (generateFile) {
        const templateFileName = `${__dirname}/.tln.conf.template`;
        if (orphan) {
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
    */
  }

  /*
  * Collect list of folder where descriptions should be merged
  * params:
  */
  enumFolders(location) {
    let ids = [];
    fs.readdirSync(location).forEach( name => {
      const p = path.join(location, name);
      try {
        if (fs.lstatSync(p).isDirectory() && ['.git', '.tln'].indexOf(name) == -1 ) {
          ids.push(name);
        } 
      } catch(err) {
        this.logger.trace('Skip folder due to access restruction', p);
      }
    });
    return ids;
  };

  /*
  * Create one child component
  * params:
  */
  dive(id, force) {
    console.log(this.enumFolders(path.join(__dirname, '..', 'presets')));
/*
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
        if (fs.existsSync(utils.getConfFile(eh)) || fs.existsSync(utils.getConfFolder(eh)) || descs.length || force) {
          component = new Component(this, id, id, eh, descs, this.logger);
          component.loadDescs();
          this.components.push(component);
        }
      }
    }
    return component;
*/
    return null;
  }

}

module.exports.createRoot = (logger, home, presetsSrc, presetsDest) => {
    /*
    this.root.loadDescsFromFolder(this.home, 'presets');
    this.root.loadDescs();
    */

  return new Component(logger, home, null, '/', []);
}
module.exports.create = (logger, home, parent, id, descs) => {
  return new Component(logger, home, parent, id, descs);
}
