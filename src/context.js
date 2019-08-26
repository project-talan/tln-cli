'use strict';

class Context {
  constructor(home, name, uuid, argv, env, dotenvs, save, validate) {
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

  clone(home = null) {
    return module.exports.create((home)?home:this.home, this.name, this.uuid, this.argv, this.env, this.dotenvs, this.save, this.validate );
  }

}

module.exports.create = (home, name, uuid, argv, env, dotenvs, save, validate) => {
  return new Context(home, name, uuid, argv, {...env}, [...dotenvs], save, validate);
}
