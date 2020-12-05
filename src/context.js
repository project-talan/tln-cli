'use strict';

class context {

  constructor(items){
    this.add(items);
  }

  add(items){
    if (items) {
      for(const id of Object.keys(items)){
        this[id] = items[id];
      }
    }
    return this;
  }

  delete(...ids) {
    for(const id of ids){
      delete this[id];
    }
    return this;
  }

  clone(...ids) {
    const items = {}
    for(const id of ids){
      items[id] = this[id];
    }
    return new context(items);
  }

  duplicate() {
    let ids = [];
    for (var id in this) {
      ids.push(id);
    }
    return this.clone.apply(this, ids);
  }
}

module.exports.create = (items) => {
  return new context(items);
}
