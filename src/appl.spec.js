'use strict';

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');

describe('Application', function() {

  const logger = require('./logger').create(0);
  const context = require('./context').create({logger, cwd: process.cwd(), home: __dirname});

  before(function() {
  });

  after(function() {
  });

  beforeEach(function () {
  })

  afterEach(function () {
  })

  it('can be created', function() {
    expect(require('./appl').create(context)).to.be.an('object');
  });
});