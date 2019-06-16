'use strict';

const utils = require('./utils');
const os = require('os');
const path = require('path');

function getDelimiter(delimiter = null) {
  return r;
}

class Variables {
  constructor(anchor, origin) {
    this.anchor = anchor;
    this.origin = origin;
    this.items = [];
  }

  buildScope(name, value, delimiter = null) {
    let d = delimiter;
    if (!d) {
      d = path.delimiter;
    }
    return { name: name, value: value, sep: path.sep, delimiter: d, env: {} };
  }
  //
  set(name, value) {
    if (typeof value === 'function') {
      this.items.push({ scope: this.buildScope(name, value), callback: value });
    } else {
      this.items.push({ scope: this.buildScope(name, value), callback: (scope) => {
        return scope.value;
      } });
    }
  }

  //
  append(name, value, delimiter = null) {
    this.items.push({ scope: this.buildScope(name, value, delimiter), callback: (scope) => {
      let v = scope.value;
      if (typeof v === 'function') {
        v = v(scope);
      }
      if (scope.env[scope.name]) {
        return `${scope.env[scope.name]}${scope.delimiter}${v}`;
      }
      return v;
    }});
  }

  //
  prepend(name, value, delimiter = null ) {
    this.items.push({ scope: this.buildScope(name, value, delimiter), callback: (scope) => {
      let v = scope.value;
      if (typeof v === 'function') {
        v = v(scope);
      }
      if (scope.env[scope.name]) {
        return `${v}${scope.delimiter}${scope.env[scope.name]}`;
      }
      return v;
    }});
  }

  //
  names(n) {
    this.items.forEach(function(e){
      n.push(e.scope.name);
    });
    return utils.uniquea(n);
  }
  //

  register(arr) {
    for(const item of arr) {
      if (item.type === 'set') {
        this.set(item.name, item.value);
      } else if (item.type === 'append') {
        this.append(item.name, item.value);
      } else if (item.type === 'prepend') {
        this.prepend(item.name, item.value);
      }
    }
  }

  //
  build(env) {
    env['COMPONENT_ANCHOR'] = this.anchor;
    env['COMPONENT_ORIGIN'] = this.origin;
    for(const e of this.items) {
      let scope = e.scope;
      scope.env = env;
      env[e.scope.name] = e.callback(scope);
    }
    delete env['COMPONENT_ANCHOR'];
    delete env['COMPONENT_ORIGIN'];
    return env;
  }
}

module.exports.create = (anchor, origin) => {
  return new Variables(anchor, origin);
}
