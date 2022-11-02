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
  const stdCatalog = 'tln';

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

});
