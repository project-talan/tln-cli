'use strict';

const os = require('os');
const path = require('path');
const fs = require('fs');

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const mockfs = require('mock-fs');

describe('Application', function() {

  let options;
  before(function() {
  });

  after(function() {
  });

  beforeEach(function () {
    options = {confipath: '', verbose: 0, detached: false, destPath: null, env: process.env, cwd: process.cwd(), tlnHome: __dirname};
  })

  afterEach(function () {
    mockfs.restore();
  })

  it('can be created', async () => {
    expect(require('./appl').create(options)).to.be.an('object');
  });

  it('can be initialized', async () => {
  });
});
