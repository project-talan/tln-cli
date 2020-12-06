'use strict';

const entity = require('./entity');

class catalog extends entity {

  /*
  *
  * params:
  */
  constructor(context) {
    super(context);
  }

}

module.exports.create = (context) => {
  return new catalog(context);
}
