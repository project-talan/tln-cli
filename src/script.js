'use strict';

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const tempfile = require('tempfile');
const utils = require('./utils');
const context = require('./context');

class Script {
  constructor(logger, params) {
    this.logger = logger;
    this.uid = params.uid;
    this.name = params.name;
    this.home = params.home;
    this.options = params.options;
    this.envs = params.envs;
    this.fn = params.fn;
  }

  getUid() {
    return this.uid;
  }

  simpifyName() {
    this.uid = this.name;
  }

  //
  // ? should we force to create path to component when execute ?
  // TODO: add windows cmd script
  async execute(cwd, save, skip, argv) {
    // prepare context
    const cntx = context.create(this.logger);
    cntx.updateEnv(this.options.parse(argv));
    cntx.updateEnv({COMPONENT_HOME: this.home});
    // create component location if not exists
    if (!fs.existsSync(this.home)) {
      fs.mkdirSync(this.home, { recursive: true });
    }
    //
    const r = this.fn(cntx);
    let fl = null;
    if (typeof r === 'string') {
      // string represents script file name
      fl = path.join(this.home, `${r}.sh`);
    } else if (r instanceof Array) {
      if (save) {
        fl = path.join(this.home, `${this.name}.sh`);
      } else {
        fl = tempfile('.sh');
      }
      let envFiles = [];
      for(const e of this.envs) {
        envFiles.push(`if [ -f ${e} ]; then export \$(cat ${e} | grep -v ^# | xargs); fi`);
      }
      //
      fs.writeFileSync(fl, ((['#!/bin/bash -e'].concat(envFiles)).concat(r)).join('\n'));
      fs.chmodSync(fl, fs.constants.S_IXUSR);
    }
    if (fl) {
      if (skip) {
        // output script to the console
        this.logger.con(fs.readFileSync(fl, 'utf-8'));
      } else {
        // run script from file
        // TODO merge process.env and custom env
        let opt = {stdio: [process.stdin, process.stdout, process.stderr], env: cntx.getEnv()};
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
    } else {
      this.looger.error(`${this.uid} could not save execution script`);
    }
  }
}

module.exports.create = (logger, params) => {
  return new Script(logger, params);
}
