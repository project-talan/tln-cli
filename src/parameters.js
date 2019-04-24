'use strict';

class Parameters {
  constructor(home, save, skip, argv, env, envFiles) {
    this.home = home;
    this.save = save;
    this.skip = skip;
    this.argv = argv;
    this.env = env;
    this.envFiles = envFiles;
  }

  clone() {
    return new Parameters(this.home, this.save, this.skip, this.argv, this.env);
  }

}

module.exports.create = (home, save, skip, argv, env, envFiles) => {
  return new Parameters(home, save, skip, argv, env, envFiles);
}
