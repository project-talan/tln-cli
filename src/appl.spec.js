'use strict';

const os = require('os');
const path = require('path');
const fs = require('fs');

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const mockfs = require('mock-fs');

describe('Application', function() {
    

  const context = require('./context').create({logger: require('./logger').create(0), os, path, fs, cwd: process.cwd(), home: __dirname});

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
    expect(require('./appl').create(context)).to.be.an('object');
  });

  it('can be initialized', async () => {
    const appl = require('./appl').create(context);
    await appl.init();
    console.log(appl.cwd);
    console.log(appl.home);
  });
});
