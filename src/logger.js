'use strict';

class Logger {
  constructor(verbose) {
    this.verbose = 3 - verbose;
    const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
    // normalize verbose level
    if (this.verbose < 0 ) this.verbose = 0;
    if (this.verbose >= levels.length ) this.verbose = levels.length - 1;
    //
    const log4js = require('log4js');
    log4js.configure({
      appenders: { /*logfile: { type: 'file', filename: '/tmp/tln.log' }, */console: { type: 'stdout' } },
      categories: { default: { appenders: [/*'logfile',*/ 'console'], level: levels[this.verbose] } }
    });
    this.logger = log4js.getLogger();
  }
  trace(...args) { this.logger.trace.apply(this.logger, args); }
  debug(...args) { this.logger.debug.apply(this.logger, args); }
  info(...args) { this.logger.info.apply(this.logger, args); }
  warn(...args) { this.logger.warn.apply(this.logger, args); }
  error(...args) { this.logger.error.apply(this.logger, args); }
  fatal(...args) { this.logger.fatal.apply(this.logger, args); }

  con(...args) { console.log.apply(console, args); }

}

module.exports.create = (verbose) => {
  return new Logger(verbose);
}
