'use strict';

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');

describe('Catalog', function() {

  const logger = require('./logger').create(0);
  const context = require('./context').create({logger});

  before(function() {
  });

  after(function() {
  });

  beforeEach(function () {
  })

  afterEach(function () {
  })

  it('can be created', function() {
    expect(require('./catalog').create(context)).to.be.an('object');
  });
});