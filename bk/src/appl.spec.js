'use strict';

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const mockfs = require('mock-fs');
const logger = require('./logger');

describe('application', function() {

  before(function() {
  });

  after(function() {
  });

  beforeEach(function () {
  })

  afterEach(function () {
  })

  it.skip('Application can be created', function() {
    /*
    mockfs({
      'home': {
        'projects': {
          'project1': {
            'component1': {
            }
          },
          '.tln.conf': '{}'
        }
      },
    });
    */
    expect(require('./appl').create(logger.create(0), process.cwd(), process.cwd(), null)).to.be.an('object');
    //mockfs.restore();
  });
});