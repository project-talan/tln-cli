'use strict';

const entity = require('./entity');
const catalog = require('./catalog');

class appl extends entity {

  constructor(context) {
    super(context);
    this.catalogs = []
    // load catalogs or create new one
    this.path2Catalogs = this.path.join(this.os.homedir(), '.talan', 'cli');
    this.listOfCatalogs = this.path.join(this.path2Catalogs, 'catalogs.json');
    //
    if (!this.fs.existsSync(this.listOfCatalogs)) {
      // create file with default catalog
      this.fs.mkdirSync(this.path2Catalogs, {recursive: true});
      this.fs.writeFileSync(this.listOfCatalogs, JSON.stringify([{name: 'default', src: null, home: this.path.join(this.home, 'components')}]));
    }
    //
    try {
      const catalogs = JSON.parse(this.fs.readFileSync(this.listOfCatalogs));
      for(const c of catalogs) {
        this.catalogs.push(catalog.create(context.clone('logger', 'os', 'path', 'fs').add(c)));
      }
    } catch (e) {
      this.logger.error(`Description of catalogs can not be loaded [${this.listOfCatalogs}] ${e.message}`);
      process.exit(1);
    }
    //
    // find root component
  }

  async lsCatalogs() {
  }

  async addCatalog(name, src) {
  }

  async removeCatalog(name) {
  }

  async updateCatalog(name) {
  }

  async config(components, options) {
    console.log(options);
  }

}

module.exports.create = (context) => {
  return new appl(context);
}
