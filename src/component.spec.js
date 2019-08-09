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
describe('component', function() {
  it('Component can be created', function() {
    expect(require('./component').create(null, '', [], null)).to.be.an('object');
  });
});