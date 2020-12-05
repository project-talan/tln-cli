'use strict';

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');

const context = require('./context');

describe('Context', function() {

  before(function() {
  });

  after(function() {
  });

  beforeEach(function () {
  })

  afterEach(function () {
  })

  it('can be created', function() {
    expect(context.create(null)).to.be.an('object');
  });

  it('stores items', function() {
    const c1 = context.create({a:'a', b: 1});
    expect(c1).to.have.all.keys('a', 'b');
    expect(c1.a).to.equal('a');
    expect(c1.b).to.equal(1);
  });

  it('adds new items', function() {
    const c1 = context.create({a:'a', b: 1});
    c1.add({c:1.5});
    expect(c1).to.have.all.keys('a', 'b', 'c');
    expect(c1.c).to.equal(1.5);
  });

  it('delete item', function() {
    const c1 = context.create({a:'a', b: 1});
    c1.delete('a');
    expect(c1).to.have.all.keys('b');
    expect(c1).to.not.have.property('c');
  });

  it('can clone itself', function() {
    const c1 = context.create({a:'a', b: 1});
    const c2 = c1.clone('a');
    expect(c2).to.have.all.keys('a');
    expect(c1.a).to.equal(c2.a);
  });

  it('can dublicate itself', function() {
    const c1 = context.create({a:'a', b: 1});
    const c2 = c1.duplicate();
    expect(c2).to.have.all.keys('a', 'b');
    expect(c1.a).to.equal(c2.a);
    expect(c1.b).to.equal(c2.b);
  });
});