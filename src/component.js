'use strict';

class Component {
  constructor(parent, id, descs, logger) {
  }
}

module.exports.create = (parent, id, descs, logger) => {
  return new Component(parent, id, descs, logger);
}
