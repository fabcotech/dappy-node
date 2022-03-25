import chai, { expect } from 'chai';
import spies from 'chai-spies';

import { createNameZone } from '../../model/fakeData';

import {
  getCertificatesFromZones,
  createFetchCertificates,
} from './get-certificates';

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
        data: 'cert1',
      },
      {
        name: 'example',
        data: 'cert2',
      },
    ]);
  });

  it('getCertificatesFromZones() with 1 zone (.example) and 1 name (foo.example)', () => {
    const zone = createNameZone();
    const certificates = getCertificatesFromZones(['foo.example'], [zone]);
    expect(certificates).to.eql([
      {
        name: 'foo.example',
        data: '123456789ABCDEF',
      },
    ]);
  });

  it('getCertificatesFromZones() with 1 zone and 1 name not .dappy prefixed', () => {
    const zone = createNameZone();
    const certificates = getCertificatesFromZones(['example'], [zone]);
    expect(certificates).to.eql([
      {
        name: 'example',
        data: '123456789ABCDEF',
      },
    ]);
  });

  it('getCertificatesFromZones() with 1 zone and 1 name .dappy prefixed', () => {
    const zone = createNameZone();
    const certificates = getCertificatesFromZones(['example.dappy'], [zone]);
    expect(certificates).to.eql([
      {
        name: 'example.dappy',
        data: '123456789ABCDEF',
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
        data: '123456789ABCDEF',
      },
      {
        name: 'zone2',
        data: '123456789ABCDEF',
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

  it('fetchCertificates() should returns NOERROR if certificates found', async () => {
    const zone = createNameZone();
    const response = await createFetchCertificates(() =>
      Promise.resolve([zone])
    )(['example']);
    expect(response.rcode).to.equal('NOERROR');
  });

  it('fetchCertificates() should returns NXDOMAIN if no certifcates found', async () => {
    const zone = createNameZone();
    const response = await createFetchCertificates(() =>
      Promise.resolve([zone])
    )(['example2']);
    expect(response.rcode).to.equal('NXDOMAIN');
  });

  it('fetchCertificates() should returns SERVFAIL if a error occured', async () => {
    const response = await createFetchCertificates(() =>
      Promise.reject(new Error('error'))
    )(['example']);
    expect(response.rcode).to.equal('SERVFAIL');
  });
});
