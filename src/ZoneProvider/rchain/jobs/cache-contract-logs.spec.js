const chai = require('chai');
const spies = require('chai-spies');

const { expect } = chai;
chai.use(spies);

const {
  parseArray,
  parseRedisUrl,
  saveToSortedSetsInRedis,
  parseBool,
  initConfig,
  queryLogs,
} = require('./cache-contract-logs');

const createPurchaseLog = (date, toBox, fromBox, amount, price, fromToken, token) => `p,${date.getTime()},${toBox},${fromBox},${amount},${price},${fromToken},${token}`;

describe('cache-contract-logs', () => {
  it('should parse contract name', () => {
    expect(
      parseArray('FOO ,BAR, BAZ FOO '),
    ).to.eql(['FOO', 'BAR', 'BAZ FOO']);
    expect(parseArray(undefined)).to.eql([]);
    expect(parseArray(',foo,,')).to.eql(['foo']);
  });
  it('should parseBool', () => {
    expect(parseBool(undefined)).to.eql(false);
    expect(parseBool('True')).to.eql(true);
    expect(parseBool('FalsE')).to.eql(false);
  });
  it('should parse parseRedisUrl', () => {
    expect(() => parseRedisUrl('redis://1.2.3.4/1')).to.not.throw();
    expect(() => parseRedisUrl('redis://1.2.3.4:1234/1')).to.not.throw();
    expect(() => parseRedisUrl('redis://bar/1')).to.not.throw();
    expect(() => parseRedisUrl('redis://bar_baz.dev/1')).to.not.throw();
    expect(() => parseRedisUrl('redis://bar_baz:1454/1')).to.not.throw();
  });
  it('should check default config', () => {
    expect(initConfig).to.throw('RCHAIN_NAMES_MASTER_REGISTRY_URI env var is not defined');

    const config = initConfig({
      RCHAIN_NAMES_MASTER_REGISTRY_URI: 'foo',
      READ_ONLY: 'http://foo',
      RCHAIN_NAMES_LOGS_CONTRACTS: 'foo,bar',
      REDIS_URL: 'redis://redis_host:1234/4',
    });
    expect(config.logsInteval).to.eql(10 * 1000);
    expect(config.contracts).to.eql(['foo', 'bar']);
  });
  it('should queryLogs', async () => {
    const exploreDeploy = () => Promise.resolve(`{
      "expr": [
        { "ExprString": { "data": "${
  createPurchaseLog(new Date('2021-11-02T14:59+00:00'), 'aaa', 'aaa', 1, 50000000, 0, 'foo')
};${
  createPurchaseLog(new Date('2021-11-02T15:05+00:00'), 'aaa', 'aaa', 1, 10000, 0, 'bar')
}" }}
      ]
    }`);
    // const exploreDeploy = require('rchain-toolkit').http.exploreDeploy;
    const logs = await queryLogs(
      exploreDeploy,
      'pridt69gz6tnsux888afui7wegoq4fcywoze5bm6rt3cbnne5kn1sk',
      'http://rnode.http.dev',
      'dappynamesystem',
    );

    expect(logs).to.eql([
      { ts: 1635865140000, msg: 'p,1635865140000,aaa,aaa,1,50000000,0,foo' },
      { ts: 1635865500000, msg: 'p,1635865500000,aaa,aaa,1,10000,0,bar' },
    ]);
  });

  it('should queryLogs empty', async () => {
    const logs = await queryLogs(() => Promise.resolve(`{
      "expr": [
        { "ExprString": { "data": "" }}
      ]
    }`), 'foo', 'http://rnode.http.dev', 'dappynamesystem');

    expect(logs).to.eql([]);
  });

  it('should save to sorted sets', async () => {
    const zAdd = chai.spy();
    const logs = [
      { ts: 1635956492287, msg: 'msg 1' },
      { ts: 1635952883276, msg: 'msg 2' },
    ];
    await saveToSortedSetsInRedis(zAdd, 'foo', logs);

    expect(zAdd).have.been.called.with('logs:foo', logs[0].ts, logs[0].msg, logs[1].ts, logs[1].msg);
  });
  it('should save nothing if no logs', async () => {
    const zAdd = chai.spy();
    const logs = [];
    await saveToSortedSetsInRedis(zAdd, 'foo', logs);

    expect(zAdd).not.have.been.called();
  });
});
