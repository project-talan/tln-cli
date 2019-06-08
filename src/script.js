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
    this.options = params.options;
    this.fn = params.fn;
  }

  getUid() {
    return this.uid;
  }

  //
  // ? should we force to create path to component when execute ?
  // TODO: add windows cmd script
  async execute(params) {
    const home = params.home;
    // prepare context
    const cntx = context.create(this.logger);
    cntx.updateEnv(params.env);
    cntx.updateEnv(this.options.parse(params.argv));
    // create component location if not exists
    if (!fs.existsSync(home)) {
      fs.mkdirSync(home, { recursive: true });
    }
    //
    const r = this.fn(cntx);
    const script = cntx.getScript();
    if (script) {
      let fl = null;
      if (typeof script === 'string') {
        // string represents script file name
        fl = path.join(home, `${script}.sh`);
      } else if (script instanceof Array) {
        if (params.save) {
          fl = path.join(home, `${this.name}.sh`);
        } else {
          fl = tempfile('.sh');
        }
        let envFiles = [];
        for(const e of params.envFiles) {
          envFiles.push(`if [ -f "${e}" ]; then export \$(envsubst < "${e}" | grep -v ^# | xargs); fi`);
        }
        //
        fs.writeFileSync(fl, ((['#!/bin/bash -e'].concat(envFiles)).concat(script)).join('\n'));
        fs.chmodSync(fl, fs.constants.S_IRUSR | fs.constants.S_IWUSR | fs.constants.S_IXUSR);
      }
      if (fl) {
        if (params.skip) {
          // output script to the console
          this.logger.con(fs.readFileSync(fl, 'utf-8'));
        } else {
          // run script from file
          let opt = {stdio: [process.stdin, process.stdout, process.stderr], env: cntx.getEnv()};
          if (fs.existsSync(home)) {
            opt.cwd = home;
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
        this.logger.error(`${this.uid} could not save execution script: ${script}`);
      }
    }
    return r;
  }
}

module.exports.create = (logger, params) => {
  return new Script(logger, params);
}
