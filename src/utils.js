
module.exports = {
  prefix: function(obj, method) { 
    return `[${obj.constructor.name}::${method}]`; 
  },
  quote: function(str) { 
    return `'${str}'`; 
  },
  uniquea: function(arr, cmp = function(a, i, p){ return a.indexOf(i) == p; }){
    return arr.filter(function(item, pos) {
      return cmp(arr, item, pos);
    });
  }
}
