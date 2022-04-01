const chai = require('chai');
const spies = require('chai-spies');

const { expect } = chai;
chai.use(spies);

const {
  cacheNegativeRecords,
  getXRecordsWsHandler,
} = require('./get-x-records');

const createPurseExpr = (purseName) => ({
  expr: [
    {
      ExprMap: {
        data: {
          [purseName]: {
            ExprMap: {
              data: {
                boxId: { ExprString: { data: 'bwymybox' } },
                id: { ExprString: { data: purseName } },
                quantity: { ExprInt: { data: 1 } },
                timestamp: { ExprInt: { data: 1639141080529 } },
              },
            },
          },
        },
      },
    },
  ],
});

const createPurseDataExpr = (purseName, data = {}) => ({
  expr: [
    {
      ExprMap: {
        data: {
          [purseName]: {
            ExprString: {
              data: Buffer.from(JSON.stringify({
                email: '',
                csp: "default-src * 'unsafe-inline' 'unsafe-eval'",
                badges: {},
                servers: [
                  { ip: '255.255.255.255', host: `${purseName}.tech`, primary: true },
                ],
                ...data,
              })).toString('hex'),
            },
          },
        },
      },
    },
  ],
});

describe('get-x-records', function test() {
  this.timeout(5000);
  it('cacheNegativeRecords method', async () => {
    const addToRedis = chai.spy(Promise.resolve({}));
    await cacheNegativeRecords(addToRedis)(['foo', 'bar', 'baz']);
    expect(addToRedis).to.have.been.called.exactly(3);
    expect(addToRedis).to.have.been.first.called.with(
      'record:foo',
      'notfound',
      'true',
    );
    expect(addToRedis).to.have.been.second.called.with(
      'record:bar',
      'notfound',
      'true',
    );
    expect(addToRedis).to.have.been.third.called.with(
      'record:baz',
      'notfound',
      'true',
    );
  });

  it('return records in cache', async () => {
    const args = {
      names: ['foo', 'bar', 'baz'],
    };
    const urlOrOptions = {
      url: 'https://read_only_node_url',
      ca: ['CERT_FILE_CONTENT'],
    };

    const redisClient = {
      hGetAll: chai.spy((r) => Promise.resolve({ id: r.replace('record:', '') })),
    };

    const log = chai.spy();
    const exploreDeploy = chai.spy();

    const r = await getXRecordsWsHandler(args, {
      redisClient,
      urlOrOptions,
      log,
      exploreDeploy,
    });

    expect(r).to.eql({
      success: true,
      records: args.names.map((n) => ({ id: n })),
    });
  });

  it('should cache records', async () => {
    const args = {
      names: ['foo', 'dappy', 'baz'],
    };
    const urlOrOptions = {};
    const cachedRecord = {};
    const redisClient = {
      keys: chai.spy(Promise.resolve({})),
      hGetAll: chai.spy((r) => {
        switch (r) {
          case 'box:bwymybox':
            return { values: JSON.stringify({ publicKey: 'publicKey' }) };
          case 'record:dappy':
            return Promise.resolve({});
          case 'record:foo':
          case 'record:baz':
          default:
            return { notfound: 'true' };
        }
      }),
      hSet: chai.spy((r, k, v) => {
        cachedRecord[k] = v;
      }),
      sAdd: chai.spy(Promise.resolve({})),
    };

    const log = chai.spy();
    const exploreDeploy = chai.spy(
      (() => {
        let call = 0;
        return () => {
          debugger;
          call += 1;
          if (call === 1) {
            return JSON.stringify(createPurseExpr('dappy'));
          }
          if (call === 2) {
            return JSON.stringify(createPurseDataExpr('dappy'));
          }
          return '';
        };
      })(),
    );

    await getXRecordsWsHandler(args, {
      redisClient,
      urlOrOptions,
      log,
      exploreDeploy,
    });

    expect(cachedRecord).to.eql({
      id: 'dappy',
      publicKey: 'publicKey',
      boxId: 'bwymybox',
      data: '{"email":"","csp":"default-src * \'unsafe-inline\' \'unsafe-eval\'","badges":{},"servers":[{"ip":"255.255.255.255","host":"dappy.tech","primary":true}]}',
    });
  });

  it('should cache and returns negative records', async () => {
    const args = {
      names: ['foo', 'bar'],
    };

    const urlOrOptions = {};
    const cachedRecords = {};
    const redisClient = {
      keys: chai.spy(Promise.resolve({})),
      hGetAll: chai.spy((r) => {
        switch (r) {
          case 'box:bwymybox':
            return { values: JSON.stringify({ publicKey: 'publicKey' }) };
          default:
            return {};
        }
      }),
      hSet: chai.spy((r, k, v) => {
        const recordName = r.replace('record:', '');
        if (!cachedRecords[recordName]) {
          cachedRecords[recordName] = {};
        }
        cachedRecords[recordName][k] = v;
      }),
      sAdd: chai.spy(Promise.resolve({})),
    };

    const exploreDeploy = chai.spy(
      (() => {
        let call = 0;
        return () => {
          call += 1;
          if (call === 1) {
            return JSON.stringify(createPurseExpr('bar'));
          }
          if (call === 2) {
            return JSON.stringify(createPurseDataExpr('bar'));
          }
          return '';
        };
      })(),
    );
    const log = chai.spy();

    const r = await getXRecordsWsHandler(args, {
      redisClient,
      urlOrOptions,
      log,
      exploreDeploy,
    });

    expect(cachedRecords.foo).to.eql({
      notfound: 'true',
    });

    expect(r).to.eql({
      success: true,
      records: [{
        id: 'foo',
        notfound: 'true',
      }, {
        id: 'bar',
        boxId: 'bwymybox',
        data: "{\"email\":\"\",\"csp\":\"default-src * 'unsafe-inline' 'unsafe-eval'\",\"badges\":{},\"servers\":[{\"ip\":\"255.255.255.255\",\"host\":\"bar.tech\",\"primary\":true}]}",
        publicKey: 'publicKey',
      }],
    });
  });

  it('should cache invalid records as negative', async () => {
    const args = {
      names: ['foo', 'bar'],
    };

    const urlOrOptions = {};
    const cachedRecords = {};
    const redisClient = {
      keys: chai.spy(Promise.resolve({})),
      hGetAll: chai.spy((r) => {
        switch (r) {
          case 'box:bwymybox':
            return { values: JSON.stringify({ publicKey: 'publicKey' }) };
          default:
            return {};
        }
      }),
      hSet: chai.spy((r, k, v) => {
        const recordName = r.replace('record:', '');
        if (!cachedRecords[recordName]) {
          cachedRecords[recordName] = {};
        }
        cachedRecords[recordName][k] = v;
      }),
      sAdd: chai.spy(Promise.resolve({})),
    };

    const exploreDeploy = chai.spy(
      (() => {
        let call = 0;
        return () => {
          call += 1;
          if (call === 1) {
            return JSON.stringify(createPurseExpr('bar'));
          }
          if (call === 2) {
            return JSON.stringify(createPurseDataExpr('bar', {
              badges: 'badges', // mismatch with record schema
            }));
          }
          return '';
        };
      })(),
    );
    const log = chai.spy();

    const r = await getXRecordsWsHandler(args, {
      redisClient,
      urlOrOptions,
      log,
      exploreDeploy,
    });

    expect(cachedRecords).to.eql({
      foo: {
        notfound: 'true',
      },
      bar: {
        notfound: 'true',
      },
    });

    expect(r).to.eql({
      success: true,
      records: [{
        id: 'foo',
        notfound: 'true',
      }, {
        id: 'bar',
        notfound: 'true',
      }],
    });
  });

  it('args are not valid', () => {});
  it('stop processing if args contains more than 5 names', () => {});
});
