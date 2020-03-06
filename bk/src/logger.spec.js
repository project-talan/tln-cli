'use strict';

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');

describe('logger', function() {

  before(function() {
  });

  after(function() {
  });

  beforeEach(function () {
  })

  afterEach(function () {
  })

  it('Logger can be created', function() {
    expect(require('./logger').create(0)).to.be.an('object');
  });
});