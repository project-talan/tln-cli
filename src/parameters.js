'use strict';

class Parameters {
  constructor(home, save, validate, argv, env, envFiles) {
    this.home = home;
    this.save = save;
    this.validate = validate;
    this.argv = argv;
    this.env = env;
    this.envFiles = envFiles;
  }

  clone() {
    return new Parameters(this.home, this.save, this.validate, this.argv, this.env);
  }

}

module.exports.create = (home, save, validate, argv, env, envFiles) => {
  return new Parameters(home, save, validate, argv, env, envFiles);
}
