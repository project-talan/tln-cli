'use strict';

const os = require('os');
const path = require('path');
const fs = require('fs');

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const mockfs = require('mock-fs');

describe('Application', function() {

  const options = {confipath: '', detached: false, destPath: null, env: process.env, envVars: null, envFiles: null, cwd: process.cwd(), tlnHome: 'tln'};
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
            '.tln.conf': '{}',
            'pepsico': {
              'it': {
                '.env1': 'VAR3=VAL3\n',
                '.env2': 'VAR4=VAL4\n'
              },
              'hr': {
              }
            }
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

  it('default detached mode run', async () => {
    const appl = factory.create(logger, componentsFactory, {...options, cwd: 'home/user'});
    await appl.init();
    expect(appl.detached).to.be.true;
    expect(appl.rootComponent).to.be.an('object');
    expect(appl.currentComponent).to.be.an('object');
    expect(appl.currentComponent.getRoot()).to.deep.equal(appl.rootComponent);

  });

  it('default normal mode run', async () => {
    const home = 'home/user/projects';
    const appl = factory.create(logger, componentsFactory, {...options, cwd: home});
    await appl.init();
    expect(appl.detached).to.be.false;
    expect(appl.rootComponent).to.be.an('object');
    expect(appl.currentComponent).to.be.an('object');
    expect(appl.currentComponent.getRoot()).to.deep.equal(appl.rootComponent);

    expect(appl.rootComponent.home).to.equal(home);
    expect(appl.currentComponent.home).to.equal(home);
  });

  it('nested folders without description', async () => {
    const home = 'home/user/projects';
    const cwd = 'home/user/projects/pepsico/hr';
    const appl = factory.create(logger, componentsFactory, {...options, cwd});
    await appl.init();
    expect(appl.detached).to.be.false;
    expect(appl.rootComponent).to.be.an('object');
    expect(appl.currentComponent).to.be.an('object');
    expect(appl.currentComponent.getRoot()).to.deep.equal(appl.rootComponent);

    expect(appl.rootComponent.home).to.equal(home);
    expect(appl.currentComponent.home).to.equal(cwd);
  });

  it('command line env variables', async () => {
    const home = 'home/user/projects';
    const cwd = 'home/user/projects/pepsico/it';
    const appl = factory.create(logger, componentsFactory, {...options, cwd, envVars: ['VAR1=VAL1','VAR2=' ]});
    await appl.init();
    expect(appl.detached).to.be.false;
    expect(appl.rootComponent).to.be.an('object');
    expect(appl.currentComponent).to.be.an('object');
    expect(appl.currentComponent.getRoot()).to.deep.equal(appl.rootComponent);

    expect(appl.cmdLineEnv.VAR1).to.equal('VAL1');
    expect(appl.cmdLineEnv.VAR2).to.equal('');
  });

  it('command line env files', async () => {
    const home = 'home/user/projects';
    const cwd = 'home/user/projects/pepsico/it';
    const appl = factory.create(logger, componentsFactory, {...options, cwd, envFiles: ['home/user/projects/pepsico/it/.env1','home/user/projects/pepsico/it/.env2' ]});
    await appl.init();
    expect(appl.detached).to.be.false;
    expect(appl.rootComponent).to.be.an('object');
    expect(appl.currentComponent).to.be.an('object');
    expect(appl.currentComponent.getRoot()).to.deep.equal(appl.rootComponent);

    expect(appl.cmdLineEnv.VAR3).to.equal('VAL3');
    expect(appl.cmdLineEnv.VAR4).to.equal('VAL4');
  });
});
