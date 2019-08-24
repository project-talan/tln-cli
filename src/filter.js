'use strict';

const os = require('os');

class Filter {
  constructor(logger) {
    this.logger = logger;
    this.data = [os.type(), os.platform(), os.release()];
    this.filter = this.data.join(';').toLowerCase();
  }

  //
  validate(pattern) {
    return (this.filter.match(pattern) !== null);
  }

}

module.exports.create = (logger) => {
  return new Filter(logger);
}
