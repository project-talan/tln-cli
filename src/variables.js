'use strict';

const utils = require('./utils');
const os = require('os');

function getDelimiter(delimiter = null) {
  let r = delimiter;
  if (!r) {
    if ( os.platform() === 'win32') {
      r = ';';
    } else {
      r = ':';
    }
  }
  return r;
}

class Variables {
  constructor() {
    this.pairs = [];
  }

  //
  add(name, value) {
    if (typeof value === 'function') {
      this.pairs.push({ name: name, value: null, callback: value });
    }
    this.pairs.push({ name: name, value: value, callback: function(n, v, vars){
      return v;
    } });
  }

  //
  append(name, value, delimiter = null) {
    this.pairs.push({ name: name, value: value, callback: function(d, n, v, env){
      if (env[n]) {
        return `${env[n]}${d}${v}`;
      }
      return v;
    }.bind(this, getDelimiter(delimiter)) });
  }

  //
  prepend(name, value, delimiter = null ) {
    this.pairs.push({ name: name, value: value, callback: function(d, n, v, env){
      if (env[n]) {
        return `${v}${d}${env[n]}`;
      }
      return v;
    }.bind(this, getDelimiter(delimiter)) });
  }

  //
  names(n) {
    this.pairs.forEach(function(e){
      n.push(e.name);
    });
    return utils.uniquea(n);
  }

  //
  build(env) {
    this.pairs.forEach(function(e){
      env[e.name] = e.callback(e.name, e.value, env);
    });
    return env;
  }
}

module.exports.create = () => {
  return new Variables();
}
