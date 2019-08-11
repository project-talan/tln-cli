'use strict';

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');

describe('appl', function() {

  before(function() {
  });

  after(function() {
  });

  beforeEach(function () {
  })

  afterEach(function () {
  })

  it('Application can be created', function() {
    expect(require('./appl').create(0, process.cwd(), null)).to.be.an('object');
  });
});