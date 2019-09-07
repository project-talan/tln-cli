'use strict';

const utils = require('./utils');
const path = require('path');

function getDelimiter(delimiter = null) {
  return r;
}

class Variables {
  /**
   * @anchor - path to component, which owns variables
   * @origin - path to component, which requests variables
  */
  constructor(anchor, origin) {
    this.anchor = anchor;
    this.origin = origin;
    this.items = [];
  }

  buildData(name, value, delimiter = null) {
    let d = delimiter;
    if (!d) {
      d = path.delimiter;
    }
    return { name: name, value: value, sep: path.sep, delimiter: d, env: {} };
  }
  //
  set(name, value) {
    if (typeof value === 'function') {
      this.items.push({ data: this.buildData(name, value), callback: value });
    } else {
      this.items.push({
        data: this.buildData(name, value), callback: (tln, data) => {
          return data.value;
        }
      });
    }
    return this;
  }

  //
  append(name, value, delimiter = null) {
    this.items.push({
      data: this.buildData(name, value, delimiter), callback: (tln, data) => {
        let v = data.value;
        if (typeof v === 'function') {
          v = v(tln, data);
        }
        if (data.env[data.name]) {
          return `${data.env[data.name]}${data.delimiter}${v}`;
        }
        return v;
      }
    });
    return this;
  }

  //
  prepend(name, value, delimiter = null) {
    this.items.push({
      data: this.buildData(name, value, delimiter), callback: (tln, data) => {
        let v = data.value;
        if (typeof v === 'function') {
          v = v(tln, data);
        }
        if (data.env[data.name]) {
          return `${v}${data.delimiter}${data.env[data.name]}`;
        }
        return v;
      }
    });
    return this;
  }

  //
  names(n) {
    this.items.forEach(function (e) {
      n.push(e.data.name);
    });
    return utils.uniquea(n);
  }
  //
  build(tln, env) {
    env['COMPONENT_ANCHOR'] = this.anchor;
    env['COMPONENT_ORIGIN'] = this.origin;
    for (const e of this.items) {
      let data = e.data;
      data.env = env;
      env[e.data.name] = e.callback(tln, data);
    }
    delete env['COMPONENT_ANCHOR'];
    delete env['COMPONENT_ORIGIN'];
    return env;
  }
}

module.exports.create = (anchor, origin) => {
  return new Variables(anchor, origin);
}
