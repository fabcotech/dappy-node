import chai from 'chai';
import spies from 'chai-spies';
import { createNameZone } from '../../model/fakeData';

import { getTLDs, normalizeRecords } from './utils';

const { expect } = chai;
chai.use(spies);

describe('dns-query', () => {
  it('normalizeRecords() returns records with zone data', () => {
    const zone = createNameZone({
      records: [
        { name: '@', type: 'A', data: '127.0.0.1' },
        { name: '', type: 'A', data: '127.0.0.1' },
        {
          name: 'foo',
          type: 'A',
          data: '127.0.0.1',
          ttl: 300,
        },
      ],
    });
    expect(normalizeRecords(zone, zone.records)).to.eql([
      {
        name: zone.origin,
        type: 'A',
        data: '127.0.0.1',
        ttl: 3600,
      },
      {
        name: zone.origin,
        type: 'A',
        data: '127.0.0.1',
        ttl: 3600,
      },
      {
        name: `foo.${zone.origin}`,
        type: 'A',
        data: '127.0.0.1',
        ttl: 300,
      },
    ]);
  });
  it('getTLDs()', () => {
    expect(getTLDs(['foo.bar.baz'])).to.eql(['baz']);
    expect(getTLDs(['foo'])).to.eql(['foo']);
    expect(getTLDs(['foo.d'])).to.eql(['foo']);
    expect(getTLDs(['foo.bar.d'])).to.eql(['bar']);
  });
});
