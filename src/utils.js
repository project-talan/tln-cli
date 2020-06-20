'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const compareVersions = require('compare-versions');

module.exports = {
  //
  getConfigFile(p) {
    return path.join(p, '.tln.conf');
  },
  //
  getConfigFolder(p, folder = '.tln') {
    return path.join(p, folder);
  },
  //
  isConfigPresent(p) {
    return (fs.existsSync(module.exports.getConfigFile(p)) || fs.existsSync(module.exports.getConfigFolder(p)));
  },
  uniquea: function (arr, cmp = (arr, item, pos) => { return arr.indexOf(item) == pos; }) {
    return arr.filter((item, pos) => {
      return cmp(arr, item, pos);
    });
  },
  canInstallComponent: (tln, id, home) => {
    const emptyDir = require('empty-dir');
    if (emptyDir.sync(home)) {
      return true;
    }
    tln.logger.con(`Component '${id}' is at '${home}'`);
    return false;
  },
  getDownloadScriptById: (tln, id, distrs) => {
    if (distrs[id]) {
      return tln.getDownloadScript(tln, distrs[id]);
    }
  },
  //[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::TLS12
  getDownloadScript: (tln, dist) => {
    let r = [];
    const osInfo = tln.getOsInfo();
    const platform = osInfo.platform;
    if (dist[platform]) {
      const opts = dist[platform].opts;
      const name = dist[platform].name;
      const url = dist[platform].url;
      //
      if (platform === 'win32') {
        r.push(`echo Downloading ${url}`);
        r.push(`powershell -Command "(New-Object System.Net.WebClient).DownloadFile('${url}', '${name}')"`);
        if (name.match('tar.gz')) {
          r.push(`tar -xvzf ${name}`);
        } else {
          r.push(`powershell -Command "Expand-Archive -LiteralPath '${name}' -DestinationPath '.'"`);
        }
        // move content
        if (opts) {
          if (opts.src && opts.flt && opts.dest) {
            r.push(`powershell -Command "Get-ChildItem -Path '${opts.src}' -Filter '${opts.flt}' -Recurse | Move-Item -Destination '${opts.dest}'"`);
            if (opts.rmv) {
              r.push(`powershell -Command "Remove-Item '${opts.rmv}'"`);
            }
          }
        }
        r.push(`powershell -Command "Remove-Item '${name}'"`);
      } else /*if (platform === 'linux') {
        r.push(`wget '${url}'`);
        if (name.match('tar.gz')) {
          r.push(`tar -xzf '${name}'`);
        } else {
          r.push(`unzip '${name}'`);
        }
        // move content
        if (opts) {
          if (opts.src && opts.flt && opts.dest) {
            r.push(`mv ${opts.src}/${opts.flt} ${opts.dest}`);
            if (opts.rmv) {
              r.push(`rmdir '${opts.rmv}'`);
            }
          }
        }
        r.push(`rm -f ${name}`);
      } else if (platform === 'darwin') */ {
        r.push(`wget '${url}'`);
        if (name.match('tar.gz') || name.match('tgz')) {
          r.push(`tar -xzf '${name}'`);
        } else {
          r.push(`unzip '${name}'`);
        }
        // move content
        if (opts) {
          if (opts.src && opts.flt && opts.dest) {
            r.push(`mv ${opts.src}/${opts.flt} ${opts.dest}`);
            if (opts.rmv) {
              r.push(`rmdir '${opts.rmv}'`);
            }
          }
        }
        r.push(`rm -f ${name}`);
      }
    }
    return r;
  },
  copyTemplate: (tln, script, src, dest, tail = []) => {
    const osInfo = tln.getOsInfo();
    const platform = osInfo.platform;
    //
    let cp_cmd = 'cp';
    let cat_cmd = 'cat';
    if (platform === 'win32') {
      cp_cmd = 'copy';
      cat_cmd = 'type';
    }
    let arr = [`${cp_cmd} ${src} ${dest}`];
    for (let i of tail) {
      arr.push(`${cat_cmd} ${i} >> ${dest}`);
    }
    script.set(arr);
  },
  unpackId: (id) => {
    const arr = id.split('-');
    let name = id;
    let version = null;
    if (arr.length > 1){
      let i = 0;
      for (let e of arr) {
        if (compareVersions.validate(e)) {
          name = arr.slice(0, i).join('-');
          version = arr.slice(i).join('-');
          break;
        }
        i++;
        //: arr.join('-')
      }
    }
    return {name, version};
  }
}
