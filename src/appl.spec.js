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
describe('appl', function() {
  it('Application can be created', function() {
    expect(require('./appl').create(process.cwd(), 0)).to.be.an('object');
  });
});