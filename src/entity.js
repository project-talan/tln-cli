
const path = require('path');
const fs = require('fs');

class Entity {
  constructor(parent, id, home, descs, logger) {

    this.parent = parent;
    this.id = id;
    this.home = home;
    this.descs = descs;
    this.logger = logger;

    this.props = {};
    this.steps = {};
    this.entities = [];
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
  print(cout, offset = '', last = false) {
    cout(`${offset} ${this.id}`);
    let cnt = this.entities.length;
    let no = offset;
    if (offset.length) {
      if (this.entities.length) {
        no = offset.substring(0, offset.length - 1) + '│';
      }
      if (last) {
        no = offset.substring(0, offset.length - 1) + ' ';
      }
    }
    this.entities.forEach(function(entity) {
      cnt--;
      const delim = (cnt)?(' ├'):(' └');
      entity.print(cout, `${no}${delim}`, cnt === 0);
    });
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

  find(id, recursive, floatUp = null){
    let entity = null;
    if (this.getId() === id) {
      entity = this;
    } else {
      // check if requested entity was already created or can be created
      entity = this.dive(id, false);
      if (!entity && recursive) {
        // collect ids
        let ids = [];
        // ... from already created entities
        this.entities.forEach(function (e) { ids.push(e.getId()); });
        // ... from descs
        this.descs.forEach(function(pair) {
          let ents = [];
          if (pair.desc.getEntities) {
            ents = pair.desc.getEntities();
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
        enumDirs(this.getHome());
        ids = ids.filter(function(item, pos) {
          return ids.indexOf(item) == pos;
        });
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
    let entity = this.entities.find(function (e) { return e.getId() === id; });
    if (!entity) {
      // collect description from already loaded sources
      const descs = [];
      this.descs.forEach(function(pair) {
        let ents = [];
        if (pair.desc.getEntities) {
          ents = pair.desc.getEntities();
        }
        //
        const ent = ents.find(function (e) { return e.id === id; });
        if (ent) {
          descs.push(this.buildDescPair(pair.path, ent));
        }
      }.bind(this));
      // create child entity
      const eh = path.join(this.getHome(), id);
      if (fs.existsSync(this.getConfFile(eh)) || fs.existsSync(this.getConfFolder(eh)) || descs.length || force) {
        entity = new Entity(this, id, eh, descs, this.logger);
        entity.loadDescs();
        this.entities.push(entity);
      }
    }
    return entity;
  }

}

module.exports.createRoot = (home, id, logger) => {
  return new Entity(null, id, home, [], logger);
}

module.exports.create = (parent, id, descs, logger) => {
  return new Entity(parent, id, path.join(parent.getHome(), id), descs, logger);
}
