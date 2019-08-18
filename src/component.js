'use strict';

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
var JSONfn = require('json-fn');

const utils = require('./utils');
const script = require('./script');

class Component {
  constructor(logger, home, parent, id, descriptions) {
    this.logger = logger;
    this.home = home;
    this.parent = parent;
    this.id = id;
    this.uuid = 'tln';
    if (this.parent) {
      let ids = [this.id];
      let p = this.parent;
      while(p){
        ids.push(p.id);
        p = p.parent;
      }
      this.uuid = ids.join('.');
    }
    this.descriptions = descriptions;
    this.components = [];
  }

  getRoot() {
    if (this.parent) {
      return this.parent.getRoot();
    }
    return this;
  }
  /*
  * Init component description from file or git repository
  * params:
  */
  initConfiguration(options) {
    if (options.repo) {
      // clone repo with tln configuration
      const folder = utils.getConfFolder(this.home);
      if (fs.existsSync(folder)) {
        this.logger.warn(`Git repository with tln configuration already exists '${folder}'. Use git pull to update it`);
      } else {
        this.logger.con(execSync(`git clone ${options.repo} ${utils.tlnFolderName}`).toString());
      }
    } else {
      // generate local configuration file
      const fileName = utils.getConfFile(this.home);
      const fe = fs.existsSync(fileName);
      let generateFile = true;
      if (fe && !options.force) {
        this.logger.error(`Configuration file already exists '${fileName}', use --force to override`);
        generateFile = false;
      }
      if (generateFile) {
        const templateFileName = path.join(__dirname, utils.tlnConfTemplate);
        if (options.lightweight) {
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
  }

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
  * Recursively scan input folder and mege all available descriptions
  * params:
  */
  mergeDescs(location, recursive) {
    let desc = null;
    // load definitions from .tln.conf file
    const conf = utils.getConfFile(location);
    if (fs.existsSync(conf)) {
      const d = require(conf);
      desc = JSONfn.clone(d);
      delete require.cache[require.resolve(conf)];
    }
    if (recursive) {
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
      this.enumFolders(location).forEach( (folder) => {
        let component = this.mergeDescs(path.join(location, folder), recursive);
        const i = components.findIndex(function (c) {return c.id === folder;});
        if (i >= 0) {
          // merge descs
          this.logger.fatal('recursive merge of folders is not implemented');
        } else {
          // add
          component.id = folder
          components.push(component);
        }
      });
      // reassign
      desc.components = function(){ return components; };
    }
    return desc;
  }

  /*
  *
  * params:
  */
  buildDescriptionPair(source, destination, description) {
    return {source: source, destination: destination, description: description};
  }

  /*
  *
  * params:
  */
  loadDescriptions() {
    this.loadDescriptionsFromFolder(this.home, this.home);
    this.loadDescriptionsFromFile(this.home, this.home, false);
  }

  /*
  *
  * params:
  */
  loadDescriptionsFromFile(location, destination, recursive) {
    let description = this.mergeDescs(location, recursive);
    if (description) {
      this.descriptions.push(this.buildDescriptionPair(location, destination, description));
    }
  }

  /*
  *
  * params:
  */
  loadDescriptionsFromFolder(location, destination, folder) {
    // add additional source from .tln folder with git repository
    const confDir = utils.getConfFolder(location, folder);
    if (fs.existsSync(confDir)) {
      this.loadDescriptionsFromFile(confDir, destination, true);
    }
  }

  isItMe(component) {
    return ((this.id === component.id) && (this.home === component.home));
  }

  /*
  * Find entity inside children or pop up to check parent and continue search there
  * params:
  */
  find(parts, strictSearch, floatUp = null) {
    let component = null;
    if (parts.length) {
      const id = parts[0];
      if (this.id === id) {
        component = this;
      } else {
        // check if requested entity was already created or can be created
        component = this.dive(id, false);
        if (component) {
          // should we dive deeper
          if (parts.length > 1) {
            component = component.find(parts.slice(1), strictSearch);
          }
        } else {
          if (!strictSearch) {
            const ids = this.getIDs();
            //
            ids.find((item) => {
              const c = this.dive(item, false);
              if (c && (!floatUp || (floatUp && !floatUp.isItMe(c)) )) {
                component = c.find(parts.slice(), strictSearch);
              }
              return (component != null);
            });
          }
          // let's try to search at one level upper
          if (floatUp && this.parent) {
            component = this.parent.find(parts.slice(), strictSearch, this);
          }
        }
      }
    }
    return component;
  }


  /*
  * Find corresponding component for every ID from array
  * params:
  */
  resolve(ids) {
    let result = [];
    if (ids.length) {
      ids.forEach((id) => {
        let component = this;
        // split id into elements, identify is it absulute path, relative or just standalone id
        let parts = id.split('/');
        let strictSearch = true;
        if (parts.length > 1) {
          if (parts[0]) {
            // relative path
          } else {
            // absolute path
            component = this.getRoot();
            parts.shift();
          }
        } else {
          // standalone id
          strictSearch = false;
        }
        // try to find inside child components
        let e = component.find(parts, strictSearch);
        if (!(e || strictSearch)) {
          // try to use components in parent's child
          e = component.find(id, strictSearch, component);
        }
        //
        if (e) {
          result.push(e);
        } else {
          this.logger.warn('component with id: [', id, '] was not found');
        }
      });
    } else {
      // resolve to the current folder component
      result.push(this.currentComponent);
    }
    return result;
  }


  /*
  * Print all information about component
  * params:
  */
  inspectComponent(options, cout) {

    let r = {};
    r.id = this.id;
    r.home = this.home;
    //r.uuid = this.uuid;
    r.parent = (this.parent)?(this.parent.id):(null);
    r.descriptions = [];
    this.descriptions.forEach( description => {
      r.descriptions.push({source: description.source, destination: description.destination});
    });
    r.tags = [];
    r.inherits = [];
    r.depends = [];
    /*/
    const execScope = this.findStep('*', filter, home, { vars: [], envFiles: [], steps:[] }, []);
    r.env = {};
    const vars = environment.create(this.logger, home, this.getId()).build(execScope.vars);
    for(let v in vars) {
      r.env[v] = vars[v];
    }
    r.dotenvs = [];
    for(const ef of execScope.envFiles) {
      r.dotenvs.push(ef);
    }
    r.steps = [];
    for(const s of execScope.steps) {
      r.steps.push(s.name);
    }
    /*/
    if (options.yaml) {
      cout((require('yaml')).stringify(r));
    } else {
      cout(JSON.stringify(r, null, 2));
    }
  }


  /*
  * Create one child component, based on description and | or information from folders
  * params:
  */
  dive(id, force) {
    // check if entity was already created
    let component = this.components.find( (c) => { return c.id === id; });
    //
    if (!component) {
      // collect description from already loaded sources
      const descriptions = [];
      this.descriptions.forEach( (d) => {
        let components = [];
        if (d.description.components) {
          components = d.description.components();
        }
        //
        const component = components.find( (c) => { return c.id === id; });
        if (component) {
          descriptions.push(this.buildDescriptionPair(d.source, d.destination, component));
        }
      });
      // create child entity, should we get home from description?
      const eh = path.join(this.home, id);
      if (utils.isConfPresent(eh) || descriptions.length || force) {
        component = new Component(this.logger, eh, this, id, descriptions);
        component.loadDescriptions();
        this.components.push(component);
      }
    }
    return component;
  }

  /*
  * Collect list of childs using all possible sources: descriptions, file system
  * params:
  */
  getIDs() {
    // collect ids
    let ids = [];
    // ... from already created components
    this.components.forEach((c) => { ids.push(c.id); });
    // ... from descs
    this.descriptions.forEach((d) => {
      let components = [];
      if (d.description.components) {
        components = d.description.components();
      }
      //
      components.forEach(function (c) {
        ids.push(c.id);
      });
    });
    // ... from file system
    if (fs.existsSync(this.home)) {
      ids = ids.concat(this.enumFolders(this.home));
    }
    // remove duplicates
    ids = utils.uniquea(ids);
    this.logger.trace('ids', ids);
    return ids;
  }

  /*
  * Create all children components from available descriptions
  * params:
  */
  construct() {
    this.getIDs().forEach((id) => {
      this.dive(id, false);
    });
  }

  /*
  * Print hierarchy of components
  * params:
  */
  print(cout, depth, offset = '', last = false) {
    // output yourself
    let status = '';
    if (!fs.existsSync(this.home)) {
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
      this.components.forEach(function (entity) {
        cnt--;
        const delim = (cnt) ? (' ├') : (' └');
        entity.print(cout, depth - 1, `${no}${delim}`, cnt === 0);
      });
    }
  }

  /*
  * 
  * params:
  */
  async execute(command, file, recursive) {
    if (fs.existsSync(this.home)) {
      if (recursive) {
        this.construct();
        for (const component of this.components) {
          await component.execute(command, file, recursive);
        }
      }
      const scriptToExecute = script.create(this.logger, this.uuid, null, (tln, s) => {
        if (command) {
          s.set([command]);
        } else if (file) {
          s.set(file)
        } else this.logger.warn(`${this.uuid} exec command input parameter is missing`);
      });
      await scriptToExecute.execute({
        home: this.home,
        argv: {},
        envFiles: [],
        env: {},
        name: this.id,
        uuid: this.uuid,
        save: false,
        validate: false
      });
    }
  }
}

module.exports.createRoot = (logger, home, presetsSrc, presetsDest) => {
  const root = new Component(logger, home, null, '/', []);
  root.loadDescriptionsFromFolder(presetsSrc, presetsDest, 'presets');
  root.loadDescriptions();
  return root;
}
module.exports.create = (logger, home, parent, id, descriptions) => {
  return new Component(logger, home, parent, id, descriptions);
}
