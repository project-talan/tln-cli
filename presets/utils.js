module.exports = {
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
        r.push(`powershell -Command "(New-Object System.Net.WebClient).DownloadFile('${url}', '${name}')"`);
        if (name.match('tar.gz')) {
          r.push(`tar -xvzf ${name}`);
        } else {
          r.push(`powershell -Command "Expand-Archive -LiteralPath ${name} -DestinationPath ."`);
        }
        // move content
        if (opts) {
          if (opts[0] && opts[1]) {
            r.push(`powershell -Command "Move-Item -Path '${opts[0]}' -Destination '${opts[1]}'"`);
            if (opts[2]) {
              r.push(`powershell -Command "Remove-Item '${opts[2]}'"`);
            }
          }
        }
        r.push(`powershell -Command "Remove-Item '${name}'"`);
      } else if (platform === 'linux') {
        r.push(`wget '${url}'`);
        r.push(`tar -xzf '${name}'`);
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
        const folder2remove = folder.split(path.sep)[0];
        script.set([
          `wget '${url}'`,
          `tar -xzf '${name}'`,
          `mv ${folder}/* .`,
          `rm -f ${name}`,
          `rm -fR ${folder2remove}`
        ]);
      }
    }
    return r;
  }
}