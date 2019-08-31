'use strict';

class Context {
  constructor(home, name, uuid, argv, env, dotenvs, save, validate) {
    this.children = [];
    this.home = home;           // cwd were script will be executed
    this.name = name;           // script name
    this.uuid = uuid;           // source component identifier
    this.argv = argv;           // command line parameters
    this.env = { ...env };      // environment varaibles which will be used during execution
    this.dotenvs = dotenvs;     // array of env files need to be included into script
    this.save = save;           // generated script will be saved into file
    this.validate = validate;   // script content will be dump to the console without execution
  }

  addDotenvs(donenvs) {
    this.dotenvs = this.dotenvs.concat(donenvs);
  }

  collectDotenvs() {
    let r = [...this.dotenvs];
    for(const c of this.children) {
      r = r.concat(c.collectDotenvs());
    }
    return r;
  }

  clone(home = null) {
    return module.exports.create((home)?home:this.home, this.name, this.uuid, this.argv, this.env, this.dotenvs, this.save, this.validate);
  }

  cloneAsParent(home = null) {
    const p = module.exports.create((home)?home:this.home, this.name, this.uuid, this.argv, this.env, this.dotenvs, this.save, this.validate);
    p.children.push(this);
    return p;
  }

  cloneAsChild(home = null) {
    const c = module.exports.create((home)?home:this.home, this.name, this.uuid, this.argv, this.env, this.dotenvs, this.save, this.validate);
    this.children.push(c);
    return c;
  }

}

module.exports.create = (home, name, uuid, argv, env, dotenvs, save, validate) => {
  return new Context(home, name, uuid, argv, {...env}, [...dotenvs], save, validate);
}
