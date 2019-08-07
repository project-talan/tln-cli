'use strict';

class Environment {
  constructor(logger, home, id) {
    this.logger = logger;
    this.env = JSON.parse(JSON.stringify(process.env));
    this.env['COMPONENT_HOME'] = home;
    this.env['COMPONENT_ID'] = id;
  }

  //
  build(variables) {
    let names = [];
    for(const v of variables) {
      names = v.vars.names(names);
      this.env = v.vars.build(this.env);
    }
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

module.exports.create = (logger, home, id) => {
  return new Environment(logger, home, id);
}
