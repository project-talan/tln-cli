const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const compareVersions = require('compare-versions');

function unpackId(id) {
  const arr = id.split('-');
  let name = id;
  let version = null;
  if (arr.length > 1){
    let i = 0;
    for (let e of arr) {
      if (e.match(/^[0-9]/)) {
        name = arr.slice(0, i).join('-');
        version = arr.slice(i).join('-');
        break;
      }
      i++;
    }
  }
  return {name, version};
}


function validateVersion(version) {
  if (compareVersions.validate(version)) {
    return true;
  }
  console.log(`[ERROR] Version with invalid format was found: ${version}`);
  return false;
}

function validateId(id) {
  const {name, version} = unpackId(id);
  return validateVersion(version);
}


const update = async () => {
  const endpoints = [
    //
    // ------------------------------------------------------------------------
    // NodeJS
    { url: 'https://nodejs.org/dist/index.json', path: 'nodejs', fn: async (response) => {
      const json = await response.json();
      return json.map( v => { return { id: 'node-' + v.version.substring(1) } });
    }},
    // ------------------------------------------------------------------------
    // Boost
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
    // ------------------------------------------------------------------------
    // CMake
    { url: 'https://api.github.com/repos/Kitware/CMake/tags', path: 'cmake', fn: async (response) => {
      const json = await response.json();
      return json.map( v => v.name.substring(1) );
    }, options: {page: 0}, it: (url, options) => {
      return `${url}?page=${++options.page}`;
    }, finalize: (data) => {
      data.sort(compareVersions).reverse();
      return data.map( v => { return { id: `cmake-${v}` } } );
    }},
    // ------------------------------------------------------------------------
    // Docker
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
    // ------------------------------------------------------------------------
    // Golang
    { url: 'https://golang.org/dl/', path: 'golang', fn: async (response) => {
      const result = []
      const html = await response.text();
      let $ = cheerio.load(html);
      const items = [];
      $("div.toggleVisible,.toggle").each(function (i, e) {
        const id = $(this).attr('id').slice(2);
        if (id.match(/^[0-9]/) && validateVersion(id)) {
          result.push(id)
        }
      });
      result.sort(compareVersions).reverse();
      return result.map(id => { return {id:`go-${id}`}});
    }},
    // ------------------------------------------------------------------------
    // Gradle
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
    // ------------------------------------------------------------------------
    // Maven
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
    // ------------------------------------------------------------------------
    // Python
    { url: 'https://www.python.org/downloads/', path: 'python', fn: async (response) => {
      const result = []
      const html = await response.text();
      let $ = cheerio.load(html);
      const items = [];
      $("#content > div > section > div.row.download-list-widget > ol > li").each(function (i, e) {
        let version = $(this).find('span > a').first().text().replace(' ', '-').toLowerCase();
        if (validateId(version)) {
          result.push({id:`${version}`});
        }
      });
      return result.sort((l, r) => l.id.attr > r.id.attr ? 1: -1 ).reverse();
    }},
    // ------------------------------------------------------------------------
    // Bitcoin
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
    // ------------------------------------------------------------------------
    // Angular
    { url: 'https://registry.npmjs.com/@angular/cli', path: 'angular', fn: async (response) => {
      const json = await response.json();
      const data = Object.keys(json.versions);
      data.sort(compareVersions).reverse();
      return data.map( v => { return { id: `angular-${v}` } });
    }},
    // ------------------------------------------------------------------------
    // Cordova
    { url: 'https://registry.npmjs.com/cordova', path: 'cordova', fn: async (response) => {
      const json = await response.json();
      const data = Object.keys(json.versions).filter(v => !v.match('nightly'));
      data.sort(compareVersions).reverse();
      return data.map( v => { return { id: `cordova-${v}` } });
    }},
    //
    // ------------------------------------------------------------------------
    // Helm chart
    { url: 'https://api.github.com/repos/helm/helm/releases', path: 'helm', fn: async (response) => {
      const json = await response.json();
      if (Array.isArray(json)) {
        return json.map( v => v.tag_name.substring(1).toLowerCase() );
      }
      return [];
    }, options: {page: 0}, it: (url, options) => {
      return `${url}?page=${++options.page}`;
    }, finalize: (data) => {
      data.sort(compareVersions).reverse();
      return data.map( v => { return { id: `helm-${v}` } } );
    }},
    //
    // ------------------------------------------------------------------------
    // Yarn chart
    { url: 'https://api.github.com/repos/yarnpkg/yarn/releases', path: 'yarn', fn: async (response) => {
      const json = await response.json();
      if (Array.isArray(json)) {
        return json.map(v => v.tag_name.substring(1).toLowerCase()).filter(v => validateVersion(v));
      }
      return [];
    }, options: {page: 0}, it: (url, options) => {
      return `${url}?page=${++options.page}`;
    }, finalize: (data) => {
      data.sort(compareVersions).reverse();
      return data.map( v => { return { id: `yarn-${v}` } } );
    }},
    //
    // ------------------------------------------------------------------------
    // Grunt
    { url: 'https://api.github.com/repos/gruntjs/grunt/releases', path: 'grunt', fn: async (response) => {
      const json = await response.json();
      if (Array.isArray(json)) {
        return json.map(v => v.tag_name.substring(1).toLowerCase()).filter(v => validateVersion(v));
      }
      return [];
    }, options: {page: 0}, it: (url, options) => {
      return `${url}?page=${++options.page}`;
    }, finalize: (data) => {
      data.sort(compareVersions).reverse();
      return data.map( v => { return { id: `grunt-${v}` } } );
    }},
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
