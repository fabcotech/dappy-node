import chai from 'chai';
import spies from 'chai-spies';
import { createNamePacketQuery, createNameZone } from '../../model/fakeData';
import { ReturnCode } from '../../model/NamePacket';
import { RecordType } from '../../model/ResourceRecords';

import { getZoneRecords, createFetchNameAnswers } from './dns-query';

const { expect } = chai;
chai.use(spies);

describe('dns-query', () => {
  it('getZoneRecords() should returns records according to query questions', () => {
    const nsQuery = createNamePacketQuery();
    const zone = createNameZone();

    const answers = getZoneRecords(nsQuery.questions, [zone]);

    expect(answers).to.eql([
      {
        type: 'A',
        class: 'IN',
        name: 'example.d',
        ttl: 3600,
        data: '127.0.0.1',
      },
    ]);
  });

  it('fetchNameAnswers() query 1 record with .d returns 1 answer with .d', async () => {
    const nsQuery = createNamePacketQuery({
      questions: [
        {
          name: 'example.d',
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
        name: 'example.d',
        ttl: 3600,
        data: '127.0.0.1',
      },
    ]);
  });

  it('fetchNameAnswers() query 1 record without .d returns answers without .d', async () => {
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

  it('fetchNameAnswers() query 2 records on 2 different zones with and without .d', async () => {
    const nsQuery = createNamePacketQuery({
      questions: [
        {
          name: 'example',
          type: RecordType.A,
          class: 'IN',
        },
        {
          name: 'bar.foo.d',
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
        name: 'bar.foo.d',
        ttl: 3600,
        data: '192.168.1.1',
      },
    ]);
  });
  it('fetchNameAnswers() return NXDOMAIN when no record found', async () => {
    const nsQuery = createNamePacketQuery();
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
      Promise.resolve([fooZone])
    )(nsQuery);

    expect(nsAnwser.rcode).to.eql(ReturnCode.NXDOMAIN);
    expect(nsAnwser.answers).to.eql([]);
  });
  it('fetchNameAnswers() return SERVFAIL when unable to fetch zones', async () => {
    const nsQuery = createNamePacketQuery();
    const nsAnwser = await createFetchNameAnswers(() =>
      Promise.reject(new Error('Unable to fetch zones'))
    )(nsQuery);

    expect(nsAnwser.rcode).to.eql(ReturnCode.SERVFAIL);
    expect(nsAnwser.answers).to.eql([]);
  });

  it('fetchNameAnswers() return NOTZONE when record is not in NameZone format', async () => {
    const nsQuery = createNamePacketQuery();
    const nsAnwser = await createFetchNameAnswers(() =>
      Promise.resolve({
        fo: 'bar',
      } as any)
    )(nsQuery);

    expect(nsAnwser.rcode).to.eql(ReturnCode.NOTZONE);
    expect(nsAnwser.answers).to.eql([]);
  });
});
