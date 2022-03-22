import chai, { expect } from 'chai';
import spies from 'chai-spies';

import { isNameZone } from './NameZone';
import { createNameZone } from './fakeData';

chai.use(spies);

describe('NameZone', () => {
  it('isNameZone()', () => {
    const nameZone = createNameZone();
    expect(isNameZone(nameZone)).to.eql(true);
    const notNameZone = {
      foo: 'bar',
    };
    expect(isNameZone(notNameZone)).to.eql(false);
    const zoneWithUnknowRR = createNameZone({
      records: [{ name: 'foo', type: 'unknown', data: 'unknown' } as any],
    });
    expect(isNameZone(zoneWithUnknowRR)).to.eql(false);
  });
});
