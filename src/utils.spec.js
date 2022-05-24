'use strict';

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');

const utils = require('./utils');

describe('Utils', function() {

  before(function() {
  });

  after(function() {
  });

  beforeEach(function () {
  })

  afterEach(function () {
  })

  it('env var record skip empty/null string', async () => {
    expect(utils.parseEnvRecord(null)).to.be.undefined;
    expect(utils.parseEnvRecord('')).to.be.undefined;
    expect(utils.parseEnvRecord('    ')).to.be.undefined;
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
    expect(utils.parseEnvRecord('key')).to.be.an('object').to.eql(res);
  });

});