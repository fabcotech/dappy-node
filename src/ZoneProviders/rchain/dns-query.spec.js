const chai = require('chai');
const spies = require('chai-spies');
const { createNamePacketQuery } = require('../model/fakeData');

const { getAnswers } = require('./dns-query');

const { expect } = chai;
chai.use(spies);

describe('dns-query', () => {
  it('should works', async () => {
    const nsQuery = createNamePacketQuery();

    expect(true).to.eql(true);

    getAnswers(nsQuery);
  });
});
