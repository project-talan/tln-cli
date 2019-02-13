'use strict';

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const tempfile = require('tempfile');
const utils = require('./utils');

class Script {
  constructor(logger, uid, name, home, fn) {
    this.logger = logger;
    this.uid = uid;
    this.name = name;
    this.home = home;
    this.fn = fn;
  }

  getUid() {
    return this.uid;
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
        fl = path.join(this.home, `${this.name}.sh`);
      } else {
        fl = tempfile('.sh');
      }
      fs.writeFileSync(fl, (['#!/bin/bash -e'].concat(r)).join('\n'));
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

module.exports.create = (logger, uid, name, home, fn) => {
  return new Script(logger, uid, name, home, fn);
}
