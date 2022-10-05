'use strict';

const path = require('path');
const fs = require('fs');
const lineReader = require('line-reader');


const configFileName = '.tln.conf';
const configFolderName = '.tln';

module.exports = {
  getConfigFile(p) {
    return path.join(p, configFileName);
  },
  //
  getConfigFolder(p, folder = configFolderName) {
    return path.join(p, folder);
  },
  //
  isConfigPresent(p) {
    return (fs.existsSync(module.exports.getConfigFile(p)) || fs.existsSync(module.exports.getConfigFolder(p)));
  },
  parseEnvRecord(line, logger, errMsg = 'Command line argument (-e | --env) is incorrect') {
    if (line && line.length) {
      let record = line.trim();
      // remove comments
      ['#', 'REM', 'rem', '//'].forEach(d => {
        const commentdelim = record.indexOf(d);
        if  (commentdelim >= 0) {
          record = record.substring(0, commentdelim).trim();
        }
      });
      //
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
  parseEnvFile(fileName, logger, errMsg = 'Specified file (--env-file) was not found') {
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
  }
}

module.exports.configFileName = configFileName;
module.exports.configFolderName = configFolderName;