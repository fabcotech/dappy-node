var chai = require('chai');
var spies = require('chai-spies');

var expect = chai.expect;
chai.use(spies);
var spy = chai.spy;

const { logs } = require('./logs');

describe('/logs', () => {
  it('should return error 500 on redis query error', async () => {
    const error = new Error('error');
    const zRevRange = spy(() => Promise.reject(error));
    const log = spy();
    const res = {
      status: spy(),
      send: spy()
    };

    await logs(zRevRange, log)({
      contract: 'foo',
      size: 100,
      offset: 0
    }, res);
    
    expect(zRevRange).to.have.been.called.with(['logs:foo', 0, 99])
    expect(res.status).to.have.been.called.with(500);
    expect(res.send).to.have.been.called.with('internal server error');
    expect(log).to.have.been.called.with(error, 'error');
  });
  it('should returns contract logs', async () => {
    const contractLogs = ["log1", "log2", "log3"];
    const zRevRange = spy(() => Promise.resolve(contractLogs));
    const res = {
      status: spy(),
      send: spy()
    };

    await logs(zRevRange, spy())({
      contract: 'foo',
      size: 100,
      offset: 0
    }, res);
    
    expect(zRevRange).to.have.been.called.with(['logs:foo', 0, 99])
    expect(res.send).to.have.been.called.with({ data: contractLogs });
  });
  
  it('should returns error 400 when size and offset are not numbers', async () => {
    const zRevRange = spy();
    const log = spy();
    const res = {
      status: spy(),
      send: spy()
    };

    await logs(zRevRange, log)({
      contract: 'foo',
      size: 'foo',
      offset: 'bar'
    }, res);
    
    expect(zRevRange).not.to.have.been.called();
    expect(res.status).to.have.been.called.with(400);
    expect(res.send).to.have.been.called.with('bad request');
  });

  it('should returns error 400 when contract is not defined', async () => {
    const zRevRange = spy();
    const log = spy();
    const res = {
      status: spy(),
      send: spy()
    };

    await logs(zRevRange, log)({
      size: 100,
      offset: 0
    }, res);
    
    expect(zRevRange).not.to.have.been.called();
    expect(res.status).to.have.been.called.with(400);
    expect(res.send).to.have.been.called.with('bad request');
  });

  it('parameter size should be between 1 and 100', async () => {
    const contractLogs = ["log1", "log2", "log3"];
    const zRevRange = spy(() => Promise.resolve(contractLogs));
    const res = {
      status: spy(),
      send: spy()
    };

    await logs(zRevRange, spy())({
      contract: 'foo',
      size: -1,
      offset: 0
    }, res);
    
    await logs(zRevRange, spy())({
      contract: 'foo',
      size: 101,
      offset: 0
    }, res);

    expect(zRevRange).to.have.been.first.called.with(['logs:foo', 0, 0])
    expect(zRevRange).to.have.been.second.called.with(['logs:foo', 0, 99])
  });
  it('parameter offset should be equal or greater than 0', async () => {
    const contractLogs = ["log1", "log2", "log3"];
    const zRevRange = spy(() => Promise.resolve(contractLogs));
    const res = {
      status: spy(),
      send: spy()
    };

    await logs(zRevRange, spy())({
      contract: 'foo',
      size: 100,
      offset: -1
    }, res);
    
    expect(zRevRange).to.have.been.first.called.with(['logs:foo', 0, 99])
  });
});