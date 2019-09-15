module.exports = {
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
  getDownloadScript: (tln, dist) => {
    r = [];
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
          r.push(`powershell -Command "Expand-Archive -LiteralPath ${name} -DestinationPath ."`);
        }
        // move content
        if (opts) {
          if (opts[0] && opts[1]) {
            // r.push(`powershell -Command "Move-Item -Path '${opts[0]}' -Destination '${opts[1]}'"`);
            r.push(`powershell -Command "Get-ChildItem -Path '${opts[0]}' -Recurse | Move-Item -destination '${opts[1]}'"`);
            if (opts[2]) {
              r.push(`powershell -Command "Remove-Item '${opts[2]}'"`);
            }
          }
        }
        r.push(`powershell -Command "Remove-Item '${name}'"`);
      } else if (platform === 'linux') {
        r.push(`wget '${url}'`);
        if (name.match('tar.gz')) {
          r.push(`tar -xzf '${name}'`);
        } else {
          r.push(`unzip '${name}'`);
        }
        // move content
        if (opts) {
          if (opts[0] && opts[1]) {
            r.push(`mv ${opts[0]} ${opts[1]}`);
            if (opts[2]) {
              r.push(`rmdir '${opts[2]}'`);
            }
          }
        }
        r.push(`rm -f ${name}`);
      } else if (platform === 'darwin') {
        r.push(`wget '${url}'`);
        if (name.match('tar.gz')) {
          r.push(`tar -xzf '${name}'`);
        } else {
          r.push(`unzip '${name}'`);
        }
        // move content
        if (opts) {
          if (opts[0] && opts[1]) {
            r.push(`mv ${opts[0]} ${opts[1]}`);
            if (opts[2]) {
              r.push(`rm -fR '${opts[2]}'`);
            }
          }
        }
        r.push(`rm -f ${name}`);
      }
    }
    return r;
  }
}