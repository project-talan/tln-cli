'use strict';

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');

describe('Catalog', function() {

  const logger = require('./logger').create(0);

  before(function() {
  });

  after(function() {
  });

  beforeEach(function () {
  })

  afterEach(function () {
  })

  it('can be created', function() {
    expect(require('./catalog').create()).to.be.an('object');
  });
});