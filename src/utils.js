'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');

module.exports = {
  //
  getConfigFile(p) {
    return path.join(p, '.tln.conf');
  },
  //
  getConfigFolder(p, folder = '.tln') {
    return path.join(p, folder);
  },
  //
  isConfigPresent(p) {
    return (fs.existsSync(module.exports.getConfigFile(p)) || fs.existsSync(module.exports.getConfigFolder(p)));
  },
  uniquea: function (arr, cmp = (arr, item, pos) => { return arr.indexOf(item) == pos; }) {
    return arr.filter((item, pos) => {
      return cmp(arr, item, pos);
    });
  }
}
