'use strict';

class Filter {
  constructor(logger, config) {
    this.logger = logger;
    this.config = config;
    this.desc = '';
    for(let n in this.config) {
      this.desc = `${this.desc} ${this.config[n]}`;
    }
    this.desc = this.desc.toLowerCase();
  }

  //
  validate(node) {
    if (node && node.filter) {
      const r = this.desc.match(node.filter);
      return (r !== null);
    }
    return true;
  }

}

module.exports.create = (logger, config) => {
  return new Filter(logger, config);
}
