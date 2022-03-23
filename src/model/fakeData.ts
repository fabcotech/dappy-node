import { NameZone } from './NameZone';
import { NamePacket, ReturnCode, PacketType } from './NamePacket';

import { mergeDeep } from '../utils/mergeDeep';
import { RRA, RRAAAA, RRCERT } from './ResourceRecords';

export const createRRA = (rra: Partial<RRA> = {}): RRA => {
  return mergeDeep(
    {
      name: '@',
      type: 'A',
      data: '127.0.0.1',
    },
    rra,
  );
};

export const createRRAAAA = (rraaaa: Partial<RRAAAA> = {}): RRAAAA => {
  return mergeDeep(
    {
      name: '@',
      type: 'AAAA',
      data: '::1',
    },
    rraaaa,
  );
};

export const createRRCERT = (rrcert: Partial<RRCERT> = {}): RRCERT => {
  return mergeDeep(
    {
      name: '@',
      type: 'CERT',
      data: '123456789ABCDEF',
    },
    rrcert,
  );
};

export const createNameZone = (zone: Partial<NameZone> = {}): NameZone => {
  return mergeDeep(
    {
      origin: 'example',
      ttl: 3600,
      records: [
        createRRA(),
        createRRAAAA(),
        createRRCERT(),
        createRRA({ name: 'foo' }),
        createRRAAAA({ name: 'foo' }),
        createRRCERT({ name: 'foo' }),
      ],
    },
    zone,
  );
};

export const createNamePacketQuery = (
  packet: Partial<NamePacket> = {},
): NamePacket => {
  return mergeDeep(
    {
      version: '1.0.0',
      type: PacketType.QUERY,
      rcode: ReturnCode.NOERROR,
      id: 0,
      flags: 0,
      questions: [
        {
          name: 'example.dappy',
          type: 'A',
          class: 'IN',
        },
      ],
    },
    packet,
  );
};

export const createNamePacketSuccessResponse = (
  packet: Partial<NamePacket> = {},
): NamePacket => {
  return mergeDeep(
    {
      version: '1.0.0',
      type: PacketType.RESPONSE,
      rcode: ReturnCode.NOERROR,
      id: 0,
      flags: 0,
      questions: [
        {
          name: 'example.dappy',
          type: 'A',
          class: 'IN',
        },
      ],
      answers: [
        {
          name: 'example.dappy',
          type: 'A',
          class: 'IN',
          ttl: 60,
          data: '127.0.0.1',
        },
      ],
    },
    packet,
  );
};

export const createNamePacketErrorResponse = (
  packet: Partial<NamePacket> = {},
): NamePacket => {
  return mergeDeep(
    {
      version: '1.0.0',
      type: PacketType.RESPONSE,
      rcode: ReturnCode.SERVFAIL,
      id: 0,
      flags: 0,
      questions: [
        {
          name: 'example.dappy',
          type: 'A',
          class: 'IN',
        },
      ],
      answers: [],
    },
    packet,
  );
};
