//'use strict';

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const mockfs = require('mock-fs');

const path = require('path');

describe('component', function() {

  let component = null;

  before(function() {
  });

  after(function() {
  });

  beforeEach(function () {
    component = require('./component').create(require('./logger').create(0), process.cwd(), null, 'test-component', [] );
  })

  afterEach(function () {
    component = null;
  })

  it('Component can be created', function() {
    const cwd = process.cwd();
    expect(component).to.be.an('object');
  });

  it('Enum folders', function() {
    mockfs({
      'android': {},
      'cmake': {},
      'docker': {},
      '.git': {},
      '.tln': {},
      'java': {},
      'maven': {},
      'nodejs': {},
      '.tln.conf': '{}'
    });
    const folders = component.enumFolders('.');
    expect(folders.length).to.be.equal(6);
    mockfs.restore();
  });

});