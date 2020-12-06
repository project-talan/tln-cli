'use strict';

const os = require('os');
const path = require('path');
const fs = require('fs');

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');

describe('Application', function() {

  const context = require('./context').create({logger: require('./logger').create(0), os, path, fs, cwd: process.cwd(), home: __dirname});

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
