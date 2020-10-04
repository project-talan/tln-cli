'use strict';

const os = require('os');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const tmp = require('tmp');

class Script {
  constructor(logger, id, componentUuid, failOnStderr, builder) {
    this.logger = logger;
    this.id = id;
    this.uuid = `${this.id}@${componentUuid}`;
    this.failOnStderr = failOnStderr;
    this.builder = builder;

    this.body = null;
    this.ext = (os.platform() === 'win32') ? ('cmd') : ('sh');
    this.prefix = (os.platform() === 'win32') ? (['echo off']) : (['#!/bin/bash -e']);
  }

  getUuid() {
    return this.uuid;
  }

  set(body) {
    this.body = body;
  }

  async execute(home, tln, env, dotenvs, save, dryRun, failOnStderr) {
    this.body = null;
    // create component location if not exists
    if (!fs.existsSync(home)) {
      fs.mkdirSync(home, { recursive: true });
    }
    // TODO: pass proxy object instead of script itself
    const result = await this.builder(tln, Object.freeze({
        logger: this.logger,
        env: {...env},
        set: (body) => this.set(body)
      })
    );
    const body = this.body;
    if (body) {
      let fl = null;
      if (typeof body === 'string') {
        // string represents script file name
        fl = body;
      } else if (body instanceof Array) {
        if (save) {
          fl = path.join(home, `${this.uuid.replace('/', '_')}.${this.ext}`);
        } else {
          const tmpobj = tmp.fileSync();
          fl = `${tmpobj.name}.${this.ext}`;
        }
        let includes = [];
        // TODO create variant for windows environment
        for (const e of dotenvs) {
          if (os.platform() === 'win32') {
            includes.push( `IF EXIST "${e}" FOR /F "tokens=*" %%i in ('type "${e}"') do SET %%i`);

          } else {
            includes.push(`if [ -f "${e}" ]; then export \$(envsubst < "${e}" | grep -v ^# | xargs); fi`);
          }
        }
        //
        fs.writeFileSync(fl, this.prefix.concat(includes).concat(body).concat(this.suffix).join('\n'));
        fs.chmodSync(fl, fs.constants.S_IRUSR | fs.constants.S_IWUSR | fs.constants.S_IXUSR);
      }
      if (fl) {
        if (dryRun) {
          // output script to the console
          this.logger.con(`[${home}]`);
          this.logger.con(fs.readFileSync(fl, 'utf-8'));
        } else {
          // run script from file
          let opt = {stdio: [process.stdin, process.stdout, process.stderr], env};
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
                resolve(code);
              })
            })
          }
          const code = await spawnPromise(fl, [], opt);
          this.logger.debug(`Script execution completed with code: ${code}`)
          if (failOnStderr && this.failOnStderr && (code !== 0)) {
            process.exitCode = code;
          }
        }
      } else {
        this.logger.error(`${this.uuid} could not save execution script: ${body}`);
      }
    }
    return result;
  }
}

module.exports.create = (logger, id, componentUuid, failOnStderr, builder) => {
  return new Script(logger, id, componentUuid, failOnStderr, builder);
}
