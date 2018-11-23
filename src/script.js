'use strict';

const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');
const utils = require('./utils');

class Script {
  constructor(logger, fn) {
    this.logger = logger;
    this.fn = fn;
  }

  //
  execute(pwd) {
    const r = this.fn();
    if (typeof r === 'string') {
    } else if (r instanceof Array) {
      console.log(r);
    }

    /*
    console.log(os.tmpdir());
    ls = spawnSync( 'ls', [ '-lh', '/usr' ] );

    console.log( `stderr: ${ls.stderr.toString()}` );
    console.log( `stdout: ${ls.stdout.toString()}` );
    */
  }
}

module.exports.create = (logger, fn) => {
  return new Script(logger, fn);
}
