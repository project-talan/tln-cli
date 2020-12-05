'use strict';

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');

describe('Application', function() {

  before(function() {
  });

  after(function() {
  });

  beforeEach(function () {
  })

  afterEach(function () {
  })

  it('can be created', function() {
    expect(require('./appl').create()).to.be.an('object');
  });
});