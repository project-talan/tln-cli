'use strict';

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');

//
beforeEach(function () {
})

afterEach(function () {
})

//
describe('logger', function() {
  it('Logger can be created', function() {
    expect(require('./logger').create(0)).to.be.an('object');
  });
});