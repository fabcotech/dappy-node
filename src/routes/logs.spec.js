var chai = require('chai');
var spies = require('chai-spies');

var expect = chai.expect;
chai.use(spies);
var spy = chai.spy;

const { logs } = require('./logs');

describe('/logs', () => {
  it('should return error 500 on redis query error', async () => {
    const error = new Error('error');
    const zRange = spy(() => Promise.reject(error));
    const log = spy();
    const res = {
      status: spy(),
      send: spy()
    };

    await logs(zRange, log)({
      contract: 'foo',
      size: 100,
      offset: 0
    }, res);
    
    expect(zRange).to.have.been.called.with('logs:foo', 0, 99, 'rev');
    expect(res.status).to.have.been.called.with(500);
    expect(res.send).to.have.been.called.with('internal server error');
    expect(log).to.have.been.called.with(error, 'error');
  });
  it('should returns contract logs', async () => {
    const contractLogs = ["log1", "log2", "log3"];
    const zRange = spy(() => Promise.resolve(contractLogs));
    const res = {
      status: spy(),
      send: spy()
    };

    await logs(zRange, spy())({
      contract: 'foo',
      size: 100,
      offset: 0
    }, res);
    
    expect(zRange).to.have.been.called.with('logs:foo', 0, 99, 'rev')
    expect(res.send).to.have.been.called.with({ data: contractLogs, success: true });
  });
  
  it('should returns error 400 when size and offset are not numbers', async () => {
    const zRange = spy();
    const log = spy();
    const res = {
      status: spy(),
      send: spy()
    };

    await logs(zRange, log)({
      contract: 'foo',
      size: 'foo',
      offset: 'bar'
    }, res);
    
    expect(zRange).not.to.have.been.called();
    expect(res.status).to.have.been.called.with(400);
    expect(res.send).to.have.been.called.with('bad request');
  });

  it('should returns error 400 when contract is not defined', async () => {
    const zRange = spy();
    const log = spy();
    const res = {
      status: spy(),
      send: spy()
    };

    await logs(zRange, log)({
      size: 100,
      offset: 0
    }, res);
    
    expect(zRange).not.to.have.been.called();
    expect(res.status).to.have.been.called.with(400);
    expect(res.send).to.have.been.called.with('bad request');
  });

  it('parameter size should be between 1 and 100', async () => {
    const contractLogs = ["log1", "log2", "log3"];
    const zRange = spy(() => Promise.resolve(contractLogs));
    const res = {
      status: spy(),
      send: spy()
    };

    await logs(zRange, spy())({
      contract: 'foo',
      size: -1,
      offset: 0
    }, res);
    
    await logs(zRange, spy())({
      contract: 'foo',
      size: 101,
      offset: 0
    }, res);

    expect(zRange).to.have.been.first.called.with('logs:foo', 0, 0, 'rev');
    expect(zRange).to.have.been.second.called.with('logs:foo', 0, 99, 'rev');
  });
  it('parameter offset should be equal or greater than 0', async () => {
    const contractLogs = ["log1", "log2", "log3"];
    const zRange = spy(() => Promise.resolve(contractLogs));
    const res = {
      status: spy(),
      send: spy()
    };

    await logs(zRange, spy())({
      contract: 'foo',
      size: 100,
      offset: -1
    }, res);
    
    expect(zRange).to.have.been.first.called.with('logs:foo', 0, 99, 'rev');
  });
});