import chai, { expect } from 'chai';
import spies from 'chai-spies';

import { isRRA, isRRAAAA, isRRCERT } from './ResourceRecords';
import { createRRA, createRRAAAA, createRRCERT } from './fakeData';

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
});
