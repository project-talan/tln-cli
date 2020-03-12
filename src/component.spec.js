//'use strict';

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const fs = require("fs");
const mockfs = require('mock-fs');
var JSONfn = require('json-fn');

const path = require('path');

describe('component', function() {

  let component = null;

  before(function() {
  });

  after(function() {
  });

  beforeEach(function () {
    // component = require('./component').create(require('./logger').create(0), '/some/path', null, 'test-component', [] );
  })

  afterEach(function () {
    component = null;
  })

  it('Component can be created', function() {
    expect(component).to.be.an('object');
  });

});