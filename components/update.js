const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const compareVersions = require('compare-versions');

const update = async () => {
  const endpoints = [
    //
    { url: 'https://nodejs.org/dist/index.json', path: 'nodejs', fn: async (response) => {
      const json = await response.json();
      return json.map( v => { return { id: 'node-' + v.version.substring(1) } });
    }},
    //
    { url: 'https://dl.bintray.com/boostorg/release/', path: 'boost', fn: async (response) => {
      const result = []
      const html = await response.text();
      let $ = cheerio.load(html);
      $("pre > a").each(function (i, e) {
        let version = $(this).text();
        if (version.match(/^[0-9]/)) {
          version = version.slice(0, -1);
          result.push({id:`boost-${version}`});
        }
      });
      return result.reverse();
    }},
    //
    { url: 'https://api.github.com/repos/Kitware/CMake/tags', path: 'cmake', fn: async (response) => {
      const json = await response.json();
      return json.map( v => v.name.substring(1) );
    }, options: {page: 0}, it: (url, options) => {
      return `${url}?page=${++options.page}`;
    }, finalize: (data) => {
      data.sort(compareVersions).reverse();
      return data.map( v => { return { id: `cmake-${v}` } } );
    }},
    //
    { url: 'https://api.github.com/repos/docker/compose/releases', path: 'docker-compose', fn: async (response) => {
      const json = await response.json();
      if (Array.isArray(json)) {
        return json.map( v => {
          let r = v.name;
          if (r[0] === 'v') {
            r = r.substring(1);
          }
          r = r.replace(' ', '-')
          return r.toLowerCase();
        });
      }
      return [];
    }, options: {page: 0}, it: (url, options) => {
      return `${url}?page=${++options.page}`;
    }, finalize: (data) => {
      data.sort(compareVersions).reverse();
      return data.map( v => { return { id: `docker-compose-${v}` } } );
    }},
    //
    { url: 'https://golang.org/dl/', path: 'golang', fn: async (response) => {
      const result = []
      const html = await response.text();
      let $ = cheerio.load(html);
      const items = [];
      $("div.toggleVisible,.toggle").each(function (i, e) {
        const id = $(this).attr('id').slice(2);
        if (id.match(/^[0-9]/)) {
          result.push(id)
        }
      });
      result.sort(compareVersions).reverse();
      return result.map(i => { return {id:`go-${i}`}});
    }},
    //
    { url: 'https://api.github.com/repos/gradle/gradle/releases', path: 'gradle', fn: async (response) => {
      const json = await response.json();
      if (Array.isArray(json)) {
        return json.map( v => v.tag_name.substring(1).toLowerCase() );
      }
      return [];
    }, options: {page: 0}, it: (url, options) => {
      return `${url}?page=${++options.page}`;
    }, finalize: (data) => {
      data.sort(compareVersions).reverse();
      return data.map( v => { return { id: `gradle-${v}` } } );
    }},
    //
    { url: 'https://archive.apache.org/dist/maven/maven-3/', path: 'maven', fn: async (response) => {
      const result = []
      const html = await response.text();
      let $ = cheerio.load(html);
      const items = [];
      $("pre > a").each(function (i, e) {
        let version = $(this).text();
        if (version.match(/^[0-9]/)) {
          version = version.slice(0, -1);
          result.push({id:`mvn-${version}`});
        }
      });
      return result.sort((l, r) => l.id.attr > r.id.attr ? 1: -1 );
    }},
    //
    { url: 'https://www.python.org/downloads/', path: 'python', fn: async (response) => {
      const result = []
      const html = await response.text();
      let $ = cheerio.load(html);
      const items = [];
      $("#content > div > section > div.row.download-list-widget > ol > li").each(function (i, e) {
        let version = $(this).find('span > a').first().text().replace(' ', '-').toLowerCase();
        result.push({id:`${version}`});
      });
      return result.sort((l, r) => l.id.attr > r.id.attr ? 1: -1 ).reverse();
    }},
    //
    { url: 'https://api.github.com/repos/bitcoin/bitcoin/releases', path: 'bitcoin/bitcoin-core', fn: async (response) => {
      const json = await response.json();
      if (Array.isArray(json)) {
        return json.map( v => v.tag_name.substring(1).toLowerCase() );
      }
      return [];
    }, options: {page: 0}, it: (url, options) => {
      return `${url}?page=${++options.page}`;
    }, finalize: (data) => {
      data.sort(compareVersions).reverse();
      return data.map( v => { return { id: `bitcoin-core-${v}` } } );
    }},
    //
    { url: 'https://registry.npmjs.com/@angular/cli', path: 'angular', fn: async (response) => {
      const json = await response.json();
      const data = Object.keys(json.versions);
      data.sort(compareVersions).reverse();
      return data.map( v => { return { id: `angular-${v}` } });
    }},
    //
    { url: 'https://registry.npmjs.com/cordova', path: 'cordova', fn: async (response) => {
      const json = await response.json();
      const data = Object.keys(json.versions).filter(v => !v.match('nightly'));
      data.sort(compareVersions).reverse();
      return data.map( v => { return { id: `cordova-${v}` } });
    }},
    //
  ];
  //
  for(const endpoint of endpoints) {
    try {
      const token = fs.readFileSync(path.join(__dirname, 'token')).toString();
      console.log(`Processing ... ${endpoint.path} [${endpoint.url}]`);
      let cont = true;
      let result = [];
      while(cont) {
        let url = endpoint.url;
        if (endpoint.it) {
          url = endpoint.it(url, endpoint.options);
        } else {
          cont = false;
        }
        console.log(` * fetching ${url}`);
        //
        const response = await fetch(url, { headers: {'Authorization': `token ${token}`}});
        const data = await endpoint.fn(response);
        result.push(...data);
        cont = cont && (data.length > 0);
      };
      if (endpoint.finalize) {
        result = endpoint.finalize(result);
      }
      fs.writeFileSync(`./components/${endpoint.path}/components.js`, `module.exports = ${JSON.stringify(result)};`);
    } catch (error) {
      console.log(error);
    }
  }
}

update();

