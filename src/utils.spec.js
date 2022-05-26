'use strict';

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const mockfs = require('mock-fs');

const utils = require('./utils');

describe('Utils', function() {

  before(function() {
  });

  after(function() {
  });

  beforeEach(function () {
    mockfs({
      '.env': 'VAR1=VAL1\n\nVAR2=VAL2\n\n\n\n\n'
    });

  })

  afterEach(function () {
    mockfs.restore();
  })

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