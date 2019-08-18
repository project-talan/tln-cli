'use strict';

const os = require('os');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const tempfile = require('tempfile');

class Script {
  constructor(logger, uuid, options, builder) {
    this.logger = logger;
    this.options = options;
    this.builder = builder;
    this.env = {};
    this.body = null;
    this.ext = (os.platform() === 'win32') ? ('cmd') : ('sh');
    this.prefix = (os.platform() === 'win32') ? (['echo off']) : (['#!/bin/bash -e']);
  }

  set(body) {
    this.body = body;
  }
  /*
  * Build and execute script
  * params:
  * - home: cwd were script will be executed
  * - argv: execution options
  * - envFiles: array of env files need to be included into script
  * - env: environment varaibles which will be used during execution
  * - name: script name
  * - uuid: exectutor component identifier
  * - save: generated script will be saved into file
  * - validate: script content will be dump to the console without execution
  */
  async execute(params) {
    const home = params.home;
    // prepare environment
    let env = { ...this.env, ...params.env };
    if (this.options) {
      const envFromOptions = this.options.parse(params.argv);
      env = {...env, ...envFromOptions};
    }
    // create component location if not exists
    if (!fs.existsSync(home)) {
      fs.mkdirSync(home, { recursive: true });
    }
    // TODO: pass proxy object instead of script itself
    const result = this.builder(null, this);
    const body = this.body;
    if (body) {
      let fl = null;
      if (typeof body === 'string') {
        // string represents script file name
        fl = path.join(home, `${body}`);
      } else if (body instanceof Array) {
        if (params.save) {
          fl = path.join(home, `${this.name}.${this.ext}`);
        } else {
          fl = tempfile(`.${this.ext}`);
        }
        let envFiles = [];
        // TODO create variant for windows environment
        for (const e of params.envFiles) {
          envFiles.push(`if [ -f "${e}" ]; then export \$(envsubst < "${e}" | grep -v ^# | xargs); fi`);
        }
        //
        fs.writeFileSync(fl, this.prefix.concat(envFiles).concat(body).join('\n'));
        fs.chmodSync(fl, fs.constants.S_IRUSR | fs.constants.S_IWUSR | fs.constants.S_IXUSR);
      }
      if (fl) {
        if (params.validate) {
          // output script to the console
          this.logger.con(fs.readFileSync(fl, 'utf-8'));
        } else {
          // run script from file
          let opt = {stdio: [process.stdin, process.stdout, process.stderr], env: env};
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
        this.logger.error(`${params.uuid} could not save execution script: ${body}`);
      }
    }
    return result;






    /*     if (fs.existsSync(this.home)) {
      if (recursive) {
        this.construct();
        this.components.forEach(function (component) {
          component.executeCommand(command, recursive);
        })
      }
      this.logger.con(execSync(command, { cwd: this.home }).toString());
    }
 */
  }
}

module.exports.create = (logger, uuid, options, builder) => {
  return new Script(logger, uuid, options, builder);
}

/*
const utils = require('./utils');
const context = require('./context');


  //
  // ? should we force to create path to component when execute ?
  // TODO: add windows cmd script
  async execute(params) {
    //
  }

*/