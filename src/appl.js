'use strict';

const entity = require('./entity');
const catalog = require('./catalog');

class appl extends entity {

  constructor(context) {
    super(context);
    //
    this.path2Catalogs = this.path.join(this.os.homedir(), '.talan', 'cli');
    this.listOfCatalogs = this.path.join(this.path2Catalogs, 'catalogs.json');
    this.catalogs = [];
    //
    this.logger.info('operating system: ', os.type(), os.platform(), os.release());
    this.logger.info(`cwd: ${this.cwd}`);
    this.logger.info('home:', this.home);
    this.logger.info(`cli home: ${this.cliHome}`);
    this.logger.info(`local repo: ${this.localRepo}`);
    this.logger.info('folders:', folders);
    this.logger.info('mode:', detached ? 'detached' : 'normal');

  }

  async init() {
    //
    // load catalogs or create new one with default item
    const context = this.getContext('logger', 'os', 'path', 'fs');
    if (!this.fs.existsSync(this.listOfCatalogs)) {
      // create file with default catalog
      this.catalogs.push(catalog.create(context.duplicate().add({name: 'default', src: null, home: this.path.join(this.home, 'components')})));
      await this.saveCatalogs();
    } else {
      //
      try {
        const catalogs = JSON.parse(this.fs.readFileSync(this.listOfCatalogs));
        for(const c of catalogs) {
          this.catalogs.push(catalog.create(context.duplicate().add(c)));
        }
      } catch (e) {
        this.logger.error(`Description of catalogs can not be loaded [${this.listOfCatalogs}] ${e.message}`);
        process.exit(1);
      }
    }
    //
    // find root component
    //
    return this;
  }

  async saveCatalogs() {
    const catalogs = [];
    this.fs.mkdirSync(this.path2Catalogs, {recursive: true});
    for (let catalog of this.catalogs) {
      catalogs.push(catalog.getContext('name', 'src', 'home'));
    }
    this.fs.writeFileSync(this.listOfCatalogs, JSON.stringify(catalogs));
  }

  async lsCatalogs() {
    const padC1 = 18;const padC2 = 48;
    this.logger.con('Name'.padEnd(padC1), 'Source'.padEnd(padC2), 'Home');
    this.catalogs.forEach(catalog => this.logger.con(catalog.name.padEnd(padC1), ((catalog.src)?catalog.src:'-').padEnd(padC2), catalog.home));
  }

  async addCatalog(name, src, home) {
    const context = this.getContext('logger', 'os', 'path', 'fs');
    this.catalogs.push(catalog.create(context.duplicate().add({name, src, home: this.path.join(this.path2Catalogs, name)})));
    await this.saveCatalogs();
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
