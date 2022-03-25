import chai, { expect } from 'chai';
import spies from 'chai-spies';

import { createNameZone } from '../../model/fakeData';

import { getCertificatesFromZones } from './get-certificates';

chai.use(spies);

describe('get-certificates', () => {
  it('getCertificatesFromZones() with 1 zone with 2 certificates for the same record', () => {
    const zone = createNameZone({
      records: [
        {
          name: '@',
          type: 'CERT',
          data: 'cert1',
        },
        {
          name: '@',
          type: 'CERT',
          data: 'cert2',
        },
      ],
    });
    const certificates = getCertificatesFromZones(['example'], [zone]);
    expect(certificates).to.eql([
      {
        name: 'example',
        certificate: 'cert1',
      },
      {
        name: 'example',
        certificate: 'cert2',
      },
    ]);
  });
  it('getCertificatesFromZones() with 1 zone (.example) and 1 name (foo.example)', () => {
    const zone = createNameZone();
    const certificates = getCertificatesFromZones(['foo.example'], [zone]);
    expect(certificates).to.eql([
      {
        name: 'foo.example',
        certificate: '123456789ABCDEF',
      },
    ]);
  });
  it('getCertificatesFromZones() with 1 zone and 1 name not .dappy prefixed', () => {
    const zone = createNameZone();
    const certificates = getCertificatesFromZones(['example'], [zone]);
    expect(certificates).to.eql([
      {
        name: 'example',
        certificate: '123456789ABCDEF',
      },
    ]);
  });
  it('getCertificatesFromZones() with 1 zone and 1 name .dappy prefixed', () => {
    const zone = createNameZone();
    const certificates = getCertificatesFromZones(['example.dappy'], [zone]);
    expect(certificates).to.eql([
      {
        name: 'example.dappy',
        certificate: '123456789ABCDEF',
      },
    ]);
  });
  it('getCertificatesFromZones() with 2 zone and 2 names', () => {
    const zone1 = createNameZone({
      origin: 'zone1',
    });
    const zone2 = createNameZone({
      origin: 'zone2',
    });
    const certificates = getCertificatesFromZones(
      ['zone1', 'zone2'],
      [zone1, zone2]
    );
    expect(certificates).to.eql([
      {
        name: 'zone1',
        certificate: '123456789ABCDEF',
      },
      {
        name: 'zone2',
        certificate: '123456789ABCDEF',
      },
    ]);
  });
  it('getCertificatesFromZones() name not found in zone', () => {
    const zone = createNameZone();
    const certificates = getCertificatesFromZones(['notfound.example'], [zone]);
    expect(certificates).to.eql([]);
  });
  it('getCertificatesFromZones() no zone found', () => {
    const certificates = getCertificatesFromZones(['example'], []);
    expect(certificates).to.eql([]);
  });
});
