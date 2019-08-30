'use strict';

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const mockfs = require('mock-fs');
const logger = require('./logger');

describe('tln', function() {

  before(function() {
  });

  after(function() {
  });

  beforeEach(function () {
  })

  afterEach(function () {
  })

  it.skip('Tln can be created', function() {
    expect(require('./tln').create(logger.create(0), process.cwd(), process.cwd(), null)).to.be.an('object');
  });
});