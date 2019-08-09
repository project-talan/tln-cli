'use strict';

const path = require('path');
const fs = require('fs');

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');

const utils = require('./utils');

//
beforeEach(function () {
})

afterEach(function () {
})

//
describe('utils', function() {
  const componentHome = path.join('path', 'to', 'component', 'home');

  it('Get configuration file name', function() {
    expect(utils.getConfFile(componentHome)).to.be.equal(path.join(componentHome, '.tln.conf'));
  });
  it('Get configuration folder name', function() {
    expect(utils.getConfFolder(componentHome)).to.be.equal(path.join(componentHome, '.tln'));
  });
  it('Check if configurations (file or/and folder) present', function() {
    let existsSyncStub = sinon.stub(fs, 'existsSync').callsFake(function (p) {
      return false;
    });
    expect(utils.isConfPresent(componentHome)).to.be.false;
    expect(existsSyncStub.called).to.be.true;
    existsSyncStub.restore();
    //
    existsSyncStub = sinon.stub(fs, 'existsSync').callsFake(function (p) {
      return (p == path.join(componentHome, '.tln.conf'));
    });
    expect(utils.isConfPresent(componentHome)).to.be.true;
    expect(existsSyncStub.called).to.be.true;
    existsSyncStub.restore();
    //
    existsSyncStub = sinon.stub(fs, 'existsSync').callsFake(function (p) {
      return (p == path.join(componentHome, '.tln'));
    });
    expect(utils.isConfPresent(componentHome)).to.be.true;
    expect(existsSyncStub.called).to.be.true;
    existsSyncStub.restore();
    //
    existsSyncStub = sinon.stub(fs, 'existsSync').callsFake(function (p) {
      return ((p == path.join(componentHome, '.tln.conf')) || (p == path.join(componentHome, '.tln')));
    });
    expect(utils.isConfPresent(componentHome)).to.be.true;
    expect(existsSyncStub.called).to.be.true;
    existsSyncStub.restore();
    //
  });
});