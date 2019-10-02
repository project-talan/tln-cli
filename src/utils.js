'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');

module.exports = {
/*
  prefix: function(obj, method) { 
    return `[${obj.constructor.name}::${method}]`; 
  },
  quote: function(str) { 
    return `'${str}'`; 
  },
*/
  tlnFolderName: '.tln',
  tlnConfTemplate: '.tln.conf.template',
  //
  uniquea: function(arr, cmp = function(a, i, p){ return a.indexOf(i) == p; }){
    return arr.filter(function(item, pos) {
      return cmp(arr, item, pos);
    });
  },
  //
  isRootPath(p) {
    // TODO validate expression at windows box
    const root = (os.platform == "win32") ? `${process.cwd().split(path.sep)[0]}${path.sep}` : path.sep;
    return (p === root);
  },
  //
  getConfFile(p) {
    return path.join(p, '.tln.conf');
  },
  //
  getConfFolder(p, folder = '.tln') {
    return path.join(p, folder);
  },
  //
  isConfPresent(p) {
    return (fs.existsSync(module.exports.getConfFile(p)) || fs.existsSync(module.exports.getConfFolder(p)));
  },
  //
  parseEnv(env) {
    let r = {};
    for (const e of env) {
      const pair = e.split('=');
      r[pair[0]] = pair[1]?pair[1]:'';
    }
    return r;
  },
  /*
  *
  */
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
  getDefaultScript: (tln, id, distrs, script) => {
    let s = [];
    if (distrs[id]) {
      Object.keys(distrs[id]).forEach( k => {
        if (tln.filter.validate(k)) {
          s = distrs[id][k];
        }
      });
    }
    if (s.length) {
      script.set(s);
      return true;
    }
    return false;
  },
  canInstallComponent: (tln, script, groupId) => {
    const emptyDir = require('empty-dir');
    //
    const home = script.env['COMPONENT_HOME'];
    const id = script.env['COMPONENT_ID'];
    if (groupId != id) {
      if (emptyDir.sync(home)) {
        return true;
      }
      script.set([
        `echo Component '${id}' is already installed at this location '${home}'`
      ]);
    }
    return false;
  },
  getDownloadScriptById: (tln, id, distrs) => {
    if (distrs[id]) {
      return tln.utils.getDownloadScript(tln, distrs[id]);
    }
  },
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
      } else if (platform === 'darwin') */{
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
      }
    }
    return r;
  }
}
