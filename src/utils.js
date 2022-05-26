'use strict';

const path = require('path');
const fs = require('fs');
const lineReader = require('line-reader');

module.exports = {
  parseEnvRecord(line, logger, errMsg = 'Command line argument (-e | --env) is incorrect') {
    if (line && line.length) {
      const record = line.trim();
      if (record.length) {
        const delim = record.indexOf('=');
        let key = record;
        let value = '';
        if (delim >= 0) {
          key = record.substring(0, delim).trim();
          value = record.substring(delim+1).trim();
        }
        if (key.length) {
          return {[key] : value};
        }
      }
    }
    if (logger) {
      logger.error(`${errMsg}: '${line}'`);
    }
  },
  parseEnvFile(fileName, logger, errMsg = 'Specified file (-env-file) is not found') {
    if (fileName) {
      if (fs.existsSync(fileName)) {
        let env = {};
        let ln = 0;
        fs.readFileSync(fileName, 'utf-8')
          .split('\n')
          .filter(Boolean)
          .forEach(line => {
            ln++;
            if (line.trim().length) {
              const e = module.exports.parseEnvRecord(line, logger, `Env var record in line: ${ln} from: '${fileName}' is incorrect`);
              if (e) {
                env = {...env, ...e};
              }
            }
          });
        return env;
      }
    }
    if (logger) {
      logger.error(`${errMsg}: '${fileName}'`);
    }
  },

}
