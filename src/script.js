'use strict';

class Script {
  constructor(logger, id, componentUuid, builder) {
    this.logger = logger;
    this.uuid = id;
    this.uuid = `${this.uuid}@${componentUuid}`;
    this.builder = builder;
  }

  getUuid() {
    return this.uuid;
  }
  
}

module.exports.create = (logger, id, componentUuid, builder) => {
  return new Script(logger, id, componentUuid, builder);
}
