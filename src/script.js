'use strict';

const path = require('path');
const fs = require('fs');
const utils = require('./utils');

class Script {
  constructor(logger) {
    this.logger = logger;
        /*
        console.log(os.tmpdir());
        const { spawnSync } = require( 'child_process' ),
        ls = spawnSync( 'ls', [ '-lh', '/usr' ] );

        console.log( `stderr: ${ls.stderr.toString()}` );
        console.log( `stdout: ${ls.stdout.toString()}` );
        */

  }
}

module.exports.create = (logger) => {
  return new Script(logger);
}
