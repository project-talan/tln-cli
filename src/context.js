'use strict';

const utils = require('./utils');

class Context {
  constructor(argv, env, dotenvs, save, validate) {
    this.prev = null;
    this.next = null;
    this.anchor = null;
    this.argv = argv;           // command line parameters
    this.env = env;             // environment varaibles which will be used during execution
    this.dotenvs = dotenvs;     // array of env files need to be included into script
    this.save = save;           // generated script will be saved into file
    this.validate = validate;   // script content will be dump to the console without execution
  }

  addDotenvs(donenvs) {
    this.dotenvs = this.dotenvs.concat(donenvs);
  }

  snapshotDotenvs() {
    let dotenvs = [];
    // find head of the chain
    let head = this;
    while (head.prev) {
      head = head.prev;
    }
    // check if we have anchor chain
    const anchor = head.anchor;
    if (anchor) {
      let tail = this;
      while (tail.next) {
        tail = tail.prev;
      }
        // insert current chain into anchor's chain
      // const after = anchor;
      const before = anchor.next;
      //
      anchor.next = head;
      head.prev = anchor;
      if (before) {
        before.prev = tail;
      }
      tail.next = before;
      // get dotenvs from anchor's chain
      dotenvs = anchor.snapshotDotenvs();
      // restore anchors chain
      anchor.next = before;
      if (before) {
        before.prev = anchor;
      }
      head.prev = null;
      tail.next = null;
    } else {
      // examine all items in chain
      do {
        dotenvs = dotenvs.concat(head.dotenvs);
        head = head.next;
      } while (head);
      dotenvs.reverse();
    }
    return dotenvs;
  }

  clone() {
    return module.exports.create(this.argv, this.env, this.dotenvs, this.save, this.validate);
  }

  cloneAsChild() {
    const c = this.clone();
    this.next = c;
    c.prev = this;
    return c;
  }

  attach() {
    const c = this.clone();
    c.anchor = this;
    return c;
  }

  detach() {
    return module.exports.create(this.argv, this.env, utils.uniquea(this.snapshotDotenvs()), this.save, this.validate);
  }

}

module.exports.create = (argv, env, dotenvs, save, validate, inherits = []) => {
  return new Context(argv, {...env}, [...dotenvs], save, validate, inherits);
}
