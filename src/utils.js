
module.exports = {
  prefix: function(obj, method) { 
    return `[${obj.constructor.name}::${method}]`; 
  },
  quote: function(str) { 
    return `'${str}'`; 
  }
}
