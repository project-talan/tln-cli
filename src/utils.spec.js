const chai = require('chai');
const expect = chai.expect;
const utils = require('./utils');

describe('utils', function() {
  it('Configuration file name', function() {
    expect(utils.getConfFile('path/to/conf')).to.be.equal('path/to/conf/.tln.conf');
  });
  it('Configuration folder name', function() {
    expect(utils.getConfFolder('path/to/folder/with/conf')).to.be.equal('path/to/folder/with/conf/.tln');
  });
});