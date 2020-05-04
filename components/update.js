/*
  TODO:
  * add latest version during update run
*/
const fs = require('fs');
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
      return json.map( v => { return { id: 'cmake-' + v.name.substring(1) } });
    }},
    //
    { url: 'https://api.github.com/repos/docker/compose/releases', path: 'docker-compose', fn: async (response) => {
      const json = await response.json();
      return json.map( v => { return { id: `docker-compose-${v.name}` } } );
      //return json.filter( v => v.name.match(/^[0-9]/)).map( v => { return { id: `docker-compose-${v.name}` } } );
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
      return json.map( v => { return { id: 'gradle-' + v.tag_name.substring(1) } } );
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
    }}
    //
  ];
  //
  for(const endpoint of endpoints) {
    try {
      console.log(`Processing ... ${endpoint.path} [${endpoint.url}]`);
      const response = await fetch(endpoint.url);
      const data = await endpoint.fn(response);
      fs.writeFileSync(`./components/${endpoint.path}/components.js`, `module.exports = ${JSON.stringify(data)};`);
    } catch (error) {
      console.log(error);
    }
  }
}


update();

