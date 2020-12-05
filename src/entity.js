'use strict';

const context = require('./context');

class entity {
  constructor(context) {
    this.bind(context);
  }

  bind(context){
    if (context) {
      for(const id of Object.keys(context)){
        this[id] = context[id];
      }
    }
  }

  getContext(...ids) {
    const items = {}
    for(const id of ids){
      items[id] = this[id];
    }
    return context.create(items);
  }

}

module.exports = entity;