'use strict';

const path = require('path');
const fs = require('fs');
const variables = require('./variables');
const utils = require('./utils');

class Component {
  constructor(parent, id, home, descs, logger) {

    this.parent = parent;
    this.id = id;
    this.home = home;
    this.descs = descs;
    this.logger = logger;

    this.props = {};
    this.steps = {};
    this.components = [];
  }
  //
  getId() {
    return this.id;
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
      status = '?'
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
  buildDescPair(source, desc) {
    return { path: source, desc: desc };
  }
  //
  getConfFile(source) {
    return path.join(source, '.tln.conf');
  }
  //
  getConfFolder(source) {
    return path.join(source, '.tln');
  }
  //
  loadDescs() {
    this.loadDescsFromSource(this.getHome());
  }
  //
  loadDescsFromSource(source) {
    // add additional source from .tln folder with git repository
    const confDir = this.getConfFolder(source);
    if (fs.existsSync(confDir)) {
      this.loadDescsFromSource(confDir);
    }
    // load definitions from .tln.conf file
    const conf = this.getConfFile(source);
    if (fs.existsSync(conf)) {
      const desc = require(conf);
      this.descs.unshift(this.buildDescPair(source, desc));
    }
  }
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
    const enumDirs = function(h) {
      return  fs.readdirSync(h).
              forEach(function(name) {
                const p = path.join(h, name);
                if (fs.lstatSync(p).isDirectory() && ['.git', '.tln'].indexOf(name) == -1 ) {
                  ids.push(name);
                }
              });
    };
    if (fs.existsSync(this.getHome())) {
      enumDirs(this.getHome());
    }
    // remove duplicates
    ids = ids.filter(function(item, pos) {
      return ids.indexOf(item) == pos;
    });
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
  
  dive(id, force) {
    // check if entity was already created
    let entity = this.components.find(function (e) { return e.getId() === id; });
    if (!entity) {
      // collect description from already loaded sources
      const descs = [];
      this.descs.forEach(function(pair) {
        let ents = [];
        if (pair.desc.components) {
          ents = pair.desc.components();
        }
        //
        const ent = ents.find(function (e) { return e.id === id; });
        if (ent) {
          descs.push(this.buildDescPair(pair.path, ent));
        }
      }.bind(this));
      // create child entity
      // TODO find more elegant solution
      if (id !== '/') {
        const eh = path.join(this.getHome(), id);
        if (fs.existsSync(this.getConfFile(eh)) || fs.existsSync(this.getConfFolder(eh)) || descs.length || force) {
          entity = new Component(this, id, eh, descs, this.logger);
          entity.loadDescs();
          this.components.push(entity);
        }
      }
    }
    return entity;
  }

  // build component environment variables
  env(names = []) {
    let r = {};
    const vars = [];
    // construct vars, collect names
    this.descs.forEach(function(pair) {
      if (pair.desc.variables) {
        const v = pair.desc.variables(variables.create());
        this.logger.trace('!!!!', v);
        names = v.names(names);
        vars.push(v);
      }
    }.bind(this));
    //
    if (this.parent) {
      r = this.parent.env(names);
    } else {
      names.forEach(function(n){
        r[n] = process.env[n];
      });
    }
    vars.forEach(function(v){
      r = v.build(r);
    });
    //
    return r;
  }

}

module.exports.createRoot = (home, id, logger) => {
  return new Component(null, id, home, [], logger);
}

module.exports.create = (parent, id, descs, logger) => {
  return new Component(parent, id, path.join(parent.getHome(), id), descs, logger);
}
