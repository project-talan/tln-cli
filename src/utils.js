'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');

module.exports = {
/*
  prefix: function(obj, method) { 
    return `[${obj.constructor.name}::${method}]`; 
  },
  quote: function(str) { 
    return `'${str}'`; 
  },
  uniquea: function(arr, cmp = function(a, i, p){ return a.indexOf(i) == p; }){
    return arr.filter(function(item, pos) {
      return cmp(arr, item, pos);
    });
  },
*/
  isRootPath(p) {
    // TODO validate expression at windows box
    const root = (os.platform == "win32") ? `${process.cwd().split(path.sep)[0]}${path.sep}` : path.sep;
    return (p === root);
  },
  getConfFile(p) {
    return path.join(p, '.tln.conf');
  },
  getConfFolder(p, folder = '.tln') {
    return path.join(p, folder);
  },
  isConfPresent(p) {
    return (fs.existsSync(module.exports.getConfFile(p)) || fs.existsSync(module.exports.getConfFolder(p)));
  }
}
