'use strict';

const os = require('os');
const path = require('path');
const fs = require('fs');

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const mockfs = require('mock-fs');

const utils = require('./utils');

describe('Utils', function() {

  const projectsHome = 'home/user/projects';

  before(function() {
  });

  after(function() {
  });

  beforeEach(function () {
    mockfs({
      '.env': 'VAR1=VAL1\n\nVAR2=VAL2\n\n\n\n\n',
      'home': {
        'user': {
          'projects': {
            'noconfig': {
            },
            'local-config': {
              '.tln.conf': '{}'
            },
            'remote-config': {
              '.tln': {
              }
            },
            'both': {
              '.tln.conf': '{}',
              '.tln': {
              }
            },
          }
        }
      }
    });

  })

  afterEach(function () {
    mockfs.restore();
  })

  it('get path to config file', async () => {
    expect(utils.getConfigFile(projectsHome)).to.equal(path.join(projectsHome, utils.configFileName));
  });

  it('get path to config folder', async () => {
    expect(utils.getConfigFolder(projectsHome)).to.equal(path.join(projectsHome, utils.configFolderName));
  });

  it('is folder a component', async () => {
    expect(utils.isConfigPresent(path.join(projectsHome, 'noconfig'))).to.be.false;
    expect(utils.isConfigPresent(path.join(projectsHome, 'local-config'))).to.be.true;
    expect(utils.isConfigPresent(path.join(projectsHome, 'remote-config'))).to.be.true;
    expect(utils.isConfigPresent(path.join(projectsHome, 'both'))).to.be.true;
  });

/*

  getConfigFile(p) {
    return path.join(p, '.tln.conf');
  },
  //
  getConfigFolder(p, folder = '.tln') {
    return path.join(p, folder);
  },
  //
  isConfigPresent(p) {
*/

  it('env var record skip empty/null string', async () => {
    expect(utils.parseEnvRecord(null)).to.be.undefined;
    expect(utils.parseEnvRecord('')).to.be.undefined;
    expect(utils.parseEnvRecord('    ')).to.be.undefined;
    expect(utils.parseEnvRecord('=')).to.be.undefined;
    expect(utils.parseEnvRecord('=val')).to.be.undefined;
  });

  it('env var record can be in "key=val" format', async () => {
    const res = {key: 'val'}
    expect(utils.parseEnvRecord('key=val')).to.be.an('object').to.eql(res);

    expect(utils.parseEnvRecord('  key=val')).to.be.an('object').to.eql(res);
    expect(utils.parseEnvRecord('  key=  val')).to.be.an('object').to.eql(res);
    expect(utils.parseEnvRecord('  key=val  ')).to.be.an('object').to.eql(res);
    expect(utils.parseEnvRecord('  key=  val  ')).to.be.an('object').to.eql(res);

    expect(utils.parseEnvRecord('key  =val')).to.be.an('object').to.eql(res);
    expect(utils.parseEnvRecord('key  =  val')).to.be.an('object').to.eql(res);
    expect(utils.parseEnvRecord('key  =val  ')).to.be.an('object').to.eql(res);
    expect(utils.parseEnvRecord('key  =  val  ')).to.be.an('object').to.eql(res);

    expect(utils.parseEnvRecord('  key  =val')).to.be.an('object').to.eql(res);
    expect(utils.parseEnvRecord('  key  =  val')).to.be.an('object').to.eql(res);
    expect(utils.parseEnvRecord('  key  =val  ')).to.be.an('object').to.eql(res);
    expect(utils.parseEnvRecord('  key  =  val  ')).to.be.an('object').to.eql(res);
  });

  it('env var record can be in "key=" format', async () => {
    const res = {key: ''}
    expect(utils.parseEnvRecord('key=')).to.be.an('object').to.eql(res);
    expect(utils.parseEnvRecord('key'))
  });

  it('dot env file should exist', async () => {
    expect(utils.parseEnvFile(null)).to.be.undefined;

    const res = {VAR1: 'VAL1', VAR2: 'VAL2'};
    expect(utils.parseEnvFile('.env')).to.be.an('object').to.eql(res);
  });

});