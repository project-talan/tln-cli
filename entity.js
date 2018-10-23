
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
  getHome() {
    return this.home;
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
  
  dive(id) {
    // check if entity was already created
    let entity = this.entities.find(function (e) { return e.id === id; });
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
      // create child entity, if entity is presented on the disc or has description inside parent
      const eh = path.join(this.getHome(), id);
      if (fs.existsSync(this.getConfFile(eh)) || fs.existsSync(this.getConfFolder(eh)) || descs.length) {
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
