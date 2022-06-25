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
  const projectsHome = '/home/user/projects'

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
      }
    });

  })

  afterEach(function () {
    logger = null;
    mockfs.restore();
  })

  it('can be created', async () => {
    const root = factory.createRoot(logger, null, projectsHome);
    expect(root).to.be.an('object');
    expect(root.getId()).to.equal('');
    expect(root.getUuid()).to.equal('');
    expect(root.getParent()).to.be.null;
    expect(root.getRoot()).to.deep.equal(root);
    expect(root.isRoot()).to.be.true;
  });

  it('can not create child component without description', async () => {
    const root = factory.createRoot(logger, null, projectsHome);
    const child = await root.createChildFromId('pepsico', false);
    expect(child).to.be.undefined;
  });

  it('can force child component creation without description', async () => {
    const root = factory.createRoot(logger, null, projectsHome);
    const child = await root.createChildFromId('pepsico', true);
    expect(child).to.be.an('object');
  });

  it('creation will return existing component if any', async () => {
    const root = factory.createRoot(logger, null, projectsHome);
    const child = await root.createChildFromId('pepsico', true);

    const child2 = await root.createChildFromId('pepsico', true);
    expect(child2).to.deep.equal(child);
  });
});
