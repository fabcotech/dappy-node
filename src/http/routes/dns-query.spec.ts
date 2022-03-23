import chai from 'chai';
import spies from 'chai-spies';
import { createNamePacketQuery, createNameZone } from '../../model/fakeData';
import { RecordType } from '../../model/ResourceRecords';

import {
  getTLDs,
  getZoneRecords,
  normalizeRecords,
  createFetchNameAnswers,
} from './dns-query';

const { expect } = chai;
chai.use(spies);

describe('dns-query', () => {
  it('getTLDs()', () => {
    expect(getTLDs(['foo.bar.baz'])).to.eql(['baz']);
    expect(getTLDs(['foo'])).to.eql(['foo']);
    expect(getTLDs(['foo.dappy'])).to.eql(['foo']);
    expect(getTLDs(['foo.bar.dappy'])).to.eql(['bar']);
  });

  it('normalizeRecords() should works', () => {
    const zone = createNameZone({
      records: [
        { name: '@', type: 'A', data: '127.0.0.1' },
        { name: '', type: 'A', data: '127.0.0.1' },
        { name: 'foo', type: 'A', data: '127.0.0.1', ttl: 300 },
      ],
    });
    expect(normalizeRecords(zone, zone.records)).to.eql([
      { name: zone.origin, type: 'A', data: '127.0.0.1', ttl: 3600 },
      { name: zone.origin, type: 'A', data: '127.0.0.1', ttl: 3600 },
      { name: `foo.${zone.origin}`, type: 'A', data: '127.0.0.1', ttl: 300 },
    ]);
  });

  it('getZoneRecords() should works', () => {
    const nsQuery = createNamePacketQuery();
    const zone = createNameZone();

    const answers = getZoneRecords(nsQuery.questions, [zone]);

    expect(answers).to.eql([
      {
        type: 'A',
        class: 'IN',
        name: 'example.dappy',
        ttl: 3600,
        data: '127.0.0.1',
      },
    ]);
  });

  it('fetchNameAnswers() query 1 record with .dappy returns 1 answer with .dappy', async () => {
    const nsQuery = createNamePacketQuery({
      questions: [
        {
          name: 'example.dappy',
          type: RecordType.A,
          class: 'IN',
        },
      ],
    });
    const zone = createNameZone();

    const nsAnwser = await createFetchNameAnswers(() =>
      Promise.resolve([zone])
    )(nsQuery);

    expect(nsAnwser.answers).to.eql([
      {
        type: 'A',
        class: 'IN',
        name: 'example.dappy',
        ttl: 3600,
        data: '127.0.0.1',
      },
    ]);
  });

  it('fetchNameAnswers() query 1 record without .dappy returns answers without .dappy', async () => {
    const nsQuery = createNamePacketQuery({
      questions: [
        {
          name: 'example',
          type: RecordType.A,
          class: 'IN',
        },
      ],
    });
    const zone = createNameZone();

    const nsAnwser = await createFetchNameAnswers(() =>
      Promise.resolve([zone])
    )(nsQuery);

    expect(nsAnwser.answers).to.eql([
      {
        type: 'A',
        class: 'IN',
        name: 'example',
        ttl: 3600,
        data: '127.0.0.1',
      },
    ]);
  });

  it('fetchNameAnswers() query 2 records on 2 different zones with and without .dappy', async () => {
    const nsQuery = createNamePacketQuery({
      questions: [
        {
          name: 'example',
          type: RecordType.A,
          class: 'IN',
        },
        {
          name: 'bar.foo.dappy',
          type: RecordType.A,
          class: 'IN',
        },
      ],
    });
    const exampleZone = createNameZone({
      origin: 'example',
      records: [
        {
          name: '',
          type: 'A',
          data: '127.0.0.1',
        },
      ],
    });
    const fooZone = createNameZone({
      origin: 'foo',
      records: [
        {
          name: 'bar',
          type: 'A',
          data: '192.168.1.1',
        },
      ],
    });

    const nsAnwser = await createFetchNameAnswers(() =>
      Promise.resolve([exampleZone, fooZone])
    )(nsQuery);

    expect(nsAnwser.answers).to.eql([
      {
        type: 'A',
        class: 'IN',
        name: 'example',
        ttl: 3600,
        data: '127.0.0.1',
      },
      {
        type: 'A',
        class: 'IN',
        name: 'bar.foo.dappy',
        ttl: 3600,
        data: '192.168.1.1',    
      }
    ]);
  });
});
