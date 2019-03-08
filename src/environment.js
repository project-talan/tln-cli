'use strict';

class Environment {
  constructor(logger, home) {
    this.logger = logger;
    this.env = JSON.parse(JSON.stringify(process.env));
    this.env['COMPONENT_HOME'] = home;
  }

  //
  build(variables) {
    let names = [];
    variables.forEach(v => {
      names = v.vars.names(names);
      this.env = v.vars.build(this.env);
    });
    //
    let r = {};
    names.forEach( n => {
      r[n] = this.env[n];
    })
    return r;
  }

  //
  getEnv() {
    return this.env;
  }

}

module.exports.create = (logger, home) => {
  return new Environment(logger, home);
}
