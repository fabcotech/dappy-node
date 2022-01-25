var chai = require('chai');
var spies = require('chai-spies');

var expect = chai.expect;
chai.use(spies);

const {
  cacheNegativeRecords
} = require('./get-x-records');

describe('get-x-records', () => {
  it('should save negative records', async () => {
    const addToRedis = chai.spy(Promise.resolve({}));
    await cacheNegativeRecords(addToRedis)(['foo', 'bar', 'baz']);
    expect(addToRedis).to.have.been.called.exactly(3);
    expect(addToRedis).to.have.been.first.called.with('record:foo', 'notfound', 'true');
    expect(addToRedis).to.have.been.second.called.with('record:bar', 'notfound', 'true');
    expect(addToRedis).to.have.been.third.called.with('record:baz', 'notfound', 'true');
  });
});