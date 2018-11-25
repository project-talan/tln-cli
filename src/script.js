'use strict';

const path = require('path');
const fs = require('fs');
const { spawnSync, execSync } = require('child_process');
const tempfile = require('tempfile');
const utils = require('./utils');

class Script {
  constructor(logger, fn, home, id) {
    this.logger = logger;
    this.fn = fn;
    this.home = home;
    this.id = id;
  }

  //
  // ? should we force to create path to component when execute ?
  execute(cwd, save, skip) {
    const r = this.fn();
    let fl = null;
    if (typeof r === 'string') {
      // string represents script file name
      fl = path.join(this.home, `${this.id}.sh`);
    } else if (r instanceof Array) {
      if (save) {
        fl = path.join(this.home, `${this.id}.sh`);
      } else {
        fl = tempfile('.sh');
      }
      fs.writeFileSync(fl, r.join('\n'));
      fs.chmodSync(fl, fs.constants.S_IXUSR);
    }
    if (fl && !skip) {
      // run script from file
      let opt = {};
      if (fs.existsSync(cwd)) {
        opt.cwd = cwd;
      }
      const ls = spawnSync(fl, opt);
      const es = ls.stderr.toString();
      if (es) {
        this.logger.error();
      }
      this.logger.con(ls.stdout.toString());
    }
  }
}

module.exports.create = (logger, fn, home, id) => {
  return new Script(logger, fn, home, id);
}
