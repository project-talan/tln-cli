'use strict';

module.exports = {
  parseEnvRecord(line) {
    if (line && line.length) {
      const record = line.trim();
      if (record.length) {
        const delim = record.indexOf('=');
        if (delim >= 0) {
          const key = record.substring(0, delim).trim();
          const value = record.substring(delim+1).trim();
          return {[key] : value};
        }
        return {[record] : ''};
      }
    }
  },

}
