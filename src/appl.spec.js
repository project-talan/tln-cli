'use strict';

const os = require('os');
const path = require('path');
const fs = require('fs');

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const mockfs = require('mock-fs');

describe('Application', function() {

  before(function() {
  });

  after(function() {
  });

  beforeEach(function () {
  })

  afterEach(function () {
    mockfs.restore();
  })

  it('can be created', async () => {
    expect(require('./appl').create({verbose: 0, home: __dirname})).to.be.an('object');
  });

  it('can be initialized', async () => {
  });
});
