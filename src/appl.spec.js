'use strict';

const os = require('os');
const path = require('path');
const fs = require('fs');

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const mockfs = require('mock-fs');

describe('Application', function() {

  const options = {confipath: '', detached: false, destPath: null, env: process.env, cwd: process.cwd(), tlnHome: 'tln'};
  let logger;
  let factory;
  let componentsFactory;
  before(function() {
  });

  after(function() {
  });

  beforeEach(function () {
    logger = require('./logger').create(1);
    factory = require('./appl');
    componentsFactory = require('./component');
    mockfs({
      'home': {
        'user': {
          'projects': {
          }
        }
      },
      'tln': mockfs.load(path.resolve(__dirname, '..')),
    });

  })

  afterEach(function () {
    mockfs.restore();
  })

  it('can be created', async () => {
    const appl = factory.create(logger, componentsFactory, options);
    expect(appl).to.be.an('object');
  });

  it('default run', async () => {
    const appl = factory.create(logger, componentsFactory, {...options, cwd: 'home/user/projects'});
    await appl.init();
  });
});
