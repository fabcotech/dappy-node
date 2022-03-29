import dnsPacket, { Packet, Question } from 'dns-packet';
import { Request, Response } from 'express';

import { isNameZone, NameZone } from '../../model/NameZone';
import {
  NameAnswer,
  NamePacket,
  PacketType,
  ReturnCode,
} from '../../model/NamePacket';
import { getTLDs, normalizeRecords } from './utils';

export const getZoneRecords = (
  questions: Question[],
  zones: NameZone[]
): NameAnswer[] =>
  questions
    .filter((q) => q.type !== 'CERT')
    .map(({ type, name }) => {
      const records = zones
        .map((zone) =>
          normalizeRecords(zone, zone.records, /\.dappy$/.test(name))
        )
        .flat();
      return records.filter(
        (record) => record.type === type && record.name === name
      );
    })
    .flat()
    .map(
      (record) =>
        ({
          type: record.type,
          class: 'IN',
          name: record.name,
          ttl: record.ttl,
          data: record.data,
        } as any)
    );

const isNameZones = (zones: any[]): zones is NameZone[] => {
  if (!Array.isArray(zones) || zones.length === 0) {
    return false;
  }
  return zones.every((zone) => isNameZone(zone));
};

export const createFetchNameAnswers =
  (getZonesApi: (names: string[]) => Promise<NameZone[]>) =>
  async (packet: NamePacket): Promise<NamePacket> => {
    if (!packet.questions || packet.questions.length === 0) {
      return {
        version: '1.0.0',
        rcode: ReturnCode.NXDOMAIN,
        type: PacketType.RESPONSE,
        id: 0,
        flags: 0,
        questions: [],
        answers: [],
        additionals: [],
        authorities: [],
      };
    }

    let tldZones: NameZone[];
    try {
      tldZones = await getZonesApi(
        getTLDs(packet.questions.map((q) => q.name))
      );
    } catch (e) {
      return {
        version: '1.0.0',
        rcode: ReturnCode.SERVFAIL,
        type: PacketType.RESPONSE,
        id: 0,
        flags: 0,
        questions: packet.questions,
        answers: [],
        additionals: [],
        authorities: [],
      };
    }

    if (!isNameZones(tldZones)) {
      return {
        version: '1.0.0',
        rcode: ReturnCode.NOTZONE,
        type: PacketType.RESPONSE,
        id: 0,
        flags: 0,
        questions: packet.questions,
        answers: [],
        additionals: [],
        authorities: [],
      };
    }
    const answers = getZoneRecords(packet.questions, tldZones);

    return {
      version: '1.0.0',
      type: PacketType.RESPONSE,
      rcode: answers.length === 0 ? ReturnCode.NXDOMAIN : ReturnCode.NOERROR,
      id: 0,
      flags: 0,
      questions: packet.questions,
      answers,
      additionals: [],
      authorities: [],
    };
  };

export const createDnsQuery =
  (getZones: (names: string[]) => Promise<NameZone[]>) =>
  async (req: Request, res: Response) => {
    res.set({
      'content-type': 'application/dns-message',
      'Access-Control-Allow-Origin': '*',
    });

    const queryPacket = dnsPacket.decode(req.body);
    const response = await createFetchNameAnswers(getZones)(
      queryPacket as NamePacket
    );

    res.send(dnsPacket.encode(response as Packet));
  };
