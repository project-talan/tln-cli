'use strict';

class Context {
  constructor(home, name, uuid, argv, env, envFile, save, validate) {
    this.home = home;             // cwd were script will be executed
    this.name = name;             // script name
    this.uuid = uuid;             // source component identifier
    this.argv = argv;             // command line parameters
    this.env = env;               // environment varaibles which will be used during execution
    this.envFile = envFile;       // array of env files need to be included into script
    this.save = save;             // generated script will be saved into file
    this.validate = validate;     // script content will be dump to the console without execution
  }

  clone() {
    return module.exports.create(this.home, this.name, this.uuid, this.argv, this.env, this.envFile, this.save, this.validate );
  }

}

module.exports.create = (home, name, uuid, argv, env, envFile, save, validate) => {
  return new Context(home, name, uuid, argv, {...env}, [...envFile], save, validate);
}
