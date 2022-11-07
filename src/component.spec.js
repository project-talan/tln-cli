'use strict';

const os = require('os');
const path = require('path');
const fs = require('fs');

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const mockfs = require('mock-fs');

describe('Component', function() {

  let logger = null;
  let factory = null;
  let root = null;
  const projectsHome = 'home/user/projects'
  const childId = 'pepsico';
  const stdCatalog = 'tln/catalog';

  before(function() {
  });

  after(function() {
  });

  beforeEach(function () {
    logger = require('./logger').create(0);
    factory = require('./component');
    mockfs({
      'home': {
        'user': {
          'projects': {
            '.tln': {
              'config1': {
                '.tln.conf': 'module.exports = {version: "2"}',
                'component1': {
                  '.tln.conf': 'module.exports = {version: "2"}',
                }
              },
              'config2': {
                '.tln.conf': 'module.exports = {version: "2"}',
              },
            },
            '.tln.conf': 'module.exports = {version: "2", components: async (tln) => ({ "petramco": { env: async (tln, env) => {}, } }) }',
            'oldconfig': {
              '.tln.conf': 'module.exports = {}',
            }
          }
        }
      },
      'tln': mockfs.load(path.resolve(__dirname, '..')),
    });
    root = factory.createRoot(logger, null, projectsHome, stdCatalog);
  })

  afterEach(function () {
    root = null;
    mockfs.restore();
    factory = null;
    logger = null;
  })
//*
  it('can be created', async () => {
    expect(root).to.be.an('object');
    expect(root.getId()).to.equal('');
    expect(root.getUuid()).to.equal('');
    expect(root.getHome()).to.equal(projectsHome);
    expect(root.getParent()).to.be.null;
    expect(root.getRoot()).to.deep.equal(root);
    expect(root.isRoot()).to.be.true;
  });

  it('can not create child component without description', async () => {
    const child = await root.createChildFromId(childId, false);
    expect(child).to.be.undefined;
  });

  it('can force child component creation without description', async () => {
    const child = await root.createChildFromId(childId, true);
    expect(child).to.be.an('object');
  });

  it('creation will return existing component if any', async () => {
    const child = await root.createChildFromId(childId, true);

    const child2 = await root.createChildFromId(childId, true);
    expect(child2).to.deep.equal(child);
  });

  it('child object inherits parent home path', async () => {
    const child = await root.createChildFromId(childId, true);
    expect(child.getHome()).to.equal(path.join(projectsHome, childId));
  });

  it('child object id & uuid are correct', async () => {
    const child = await root.createChildFromId(childId, true);
    expect(child.getId()).to.equal(childId);
    expect(child.getUuid()).to.equal([child.getParent().getUuid()].concat([child.getId()]).join('/'));
  });

  it('child object id & uuid are correct', async () => {
    const child = await root.createChildFromId(childId, true);
    expect(child.getId()).to.equal(childId);
    expect(child.getUuid()).to.equal([child.getParent().getUuid()].concat([child.getId()]).join('/'));
  });

  it('root component should load description from standard catalog, projects\'s home and .tln folder in orrect order', async () => {
    expect(root.descriptions.length).to.equal(4);
    expect(root.descriptions[0].source).to.equal('tln/catalog/.tln.conf');
    expect(root.descriptions[1].source).to.equal('home/user/projects/.tln/config1/.tln.conf');
    expect(root.descriptions[2].source).to.equal('home/user/projects/.tln/config2/.tln.conf');
    expect(root.descriptions[3].source).to.equal('home/user/projects/.tln.conf');
  });
//*/
  it('component should skip old config file', async () => {
    const child = await root.createChildFromId('oldconfig', true);
    expect(child.descriptions.length).to.equal(0);
  });

  it('component should inherits description from parent component', async () => {
    const child = await root.createChildFromId('petramco', true);
    expect(child.descriptions.length).to.equal(1);
  });


});
