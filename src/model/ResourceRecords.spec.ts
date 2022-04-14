import chai, { expect } from 'chai';
import spies from 'chai-spies';

import { isRRA, isRRAAAA, isRRCERT, isRRCSP, isRRTXT } from './ResourceRecords';
import {
  createRRA,
  createRRAAAA,
  createRRCERT,
  createRRCSP,
  createRRTXT,
} from './fakeData';

chai.use(spies);

describe('ResourceRecords', () => {
  it('isRRA()', () => {
    const recordA = createRRA();
    expect(isRRA(recordA)).to.eql(true);
    const notRecordA = {
      foo: 'bar',
    };
    expect(isRRA(notRecordA)).to.eql(false);
  });
  it('isRRAAAA()', () => {
    const recordAAAAA = createRRAAAA();
    expect(isRRAAAA(recordAAAAA)).to.eql(true);
    const notRecordAAAA = {
      foo: 'bar',
    };
    expect(isRRAAAA(notRecordAAAA)).to.eql(false);
  });
  it('isRRCERT()', () => {
    const recordCERT = createRRCERT();
    expect(isRRCERT(recordCERT)).to.eql(true);
    const notRecordCERT = {
      foo: 'bar',
    };
    expect(isRRCERT(notRecordCERT)).to.eql(false);
  });

  it('isRRTXT()', () => {
    const recordTXT = createRRTXT();
    expect(isRRTXT(recordTXT)).to.eql(true);
    const notRecordTXT = {
      foo: 'bar',
    };
    expect(isRRCERT(notRecordTXT)).to.eql(false);
  });

  it('isRRCSP()', () => {
    const recordCSP = createRRCSP();
    expect(isRRCSP(recordCSP)).to.eql(true);
    const notRecordCSP = {
      foo: 'bar',
    };
    expect(isRRCERT(notRecordCSP)).to.eql(false);
  });
});
