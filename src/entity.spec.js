'use strict';

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');

const context = require('./context');

describe('Entity', function() {

  const createEntity = (context) => {
    return new (require('./entity'))(context);
  }

  before(function() {
  });

  after(function() {
  });

  beforeEach(function () {
  })

  afterEach(function () {
  })

  it('can be created', function() {
    expect(createEntity(null)).to.be.an('object');
  });

  it('stores context properly', function() {
    const c1 = context.create({a:'a', b: 1});
    const e = createEntity(c1);
    expect(e.a).to.equal(c1.a);
    expect(e.b).to.equal(c1.b);

    const c2 = e.getContext('a', 'b');
    expect(c1.a).to.equal(c2.a);
    expect(c1.b).to.equal(c2.b);

  });

});