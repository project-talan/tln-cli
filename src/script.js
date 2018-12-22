'use strict';

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
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
  async execute(cwd, save, skip, argv) {
    const r = this.fn();
    let fl = null;
    if (typeof r === 'string') {
      // string represents script file name
      fl = path.join(this.home, `${r}.sh`);
    } else if (r instanceof Array) {
      if (save) {
        if (!fs.existsSync(this.home)) {
          fs.mkdirSync(this.home, { recursive: true });
        }
        fl = path.join(this.home, `${this.id}.sh`);
      } else {
        fl = tempfile('.sh');
      }
      fs.writeFileSync(fl, r.join('\n'));
      fs.chmodSync(fl, fs.constants.S_IXUSR);
    }
    if (fl && !skip) {
      // run script from file
      // TODO merge process.env and custom env
      let opt = {stdio: [process.stdin, process.stdout, process.stderr], /*env:*/};
      if (fs.existsSync(cwd)) {
        opt.cwd = cwd;
      }
      let spawnPromise = (command, args, options) => {
        return new Promise((resolve, reject) => {
          const child = spawn(command, args, options)
          /*/
          child.stdout.on('data', (data) => {
            this.logger.info(`stdout: ${data}`)
          })
          child.stderr.on('data', (data) => {
            this.logger.info(`stderr: ${data}`)
          })
          /*/

          child.on('close', (code) => {
            /*/
            if (code !== 0)
              this.logger.error(`Command execution failed with code: ${code}`)
            else
              this.logger.info(`Command execution completed with code: ${code}`)
            /*/
            resolve()
          })
        })
      }
      await spawnPromise(fl, [], opt);
    }
  }
}

module.exports.create = (logger, fn, home, id) => {
  return new Script(logger, fn, home, id);
}
