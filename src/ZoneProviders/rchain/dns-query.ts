import dnsPacket, { Packet, Question } from 'dns-packet';
import { Request, Response } from 'express';

import { getXRecordsWsHandler } from './get-x-records';
import { pickRandomReadOnly } from './pickRandomReadOnly';
import { log } from '../../log';
import { NameZone } from '../../model/NameZone';
import { RR } from '../../model/ResourceRecords';
import { NameAnswer, NamePacket, PacketType, ReturnCode } from '../../model/NamePacket';

export const getRecordName = (recordName: string, zoneOrigin: string): string => {
  switch (recordName) {
    case '@':
    case '':
    case undefined:
      return zoneOrigin;
    default:
      return `${recordName}.${zoneOrigin}`;
  }
}

export const normalizeRecords = (zone: NameZone, records: RR[], appendSuffixDappy: boolean = false): RR[] =>
  records.map(record => ({
    ...record,
    name: getRecordName(record.name, zone.origin) + (appendSuffixDappy ? '.dappy' : ''), 
    ttl: record.ttl || zone.ttl,
  }));

export const getZoneRecords = (questions: Question[], zones: NameZone[]): NameAnswer[] => 
  questions
    .filter((q) => q.type !== 'CERT')
    .map(({ type, name }) => {
      const records = zones.map((zone) => normalizeRecords(zone, zone.records, /\.dappy$/.test(name))).flat();
      return records.filter(record => record.type === type && record.name === name);
    })
    .flat()
    .map(record => ({
      type: record.type,
      class: 'IN',
      name: record.name,
      ttl: record.ttl,
      data: record.data,
    }) as any);

export const getZones = (store: any) => async (names: string[]): Promise<NameZone[]> => {
  const result = await getXRecordsWsHandler({ names },
  {
    redisClient: store.redisClient,
    log,
    urlOrOptions: pickRandomReadOnly(store),
  });

  if (!result.success) {
    throw new Error('Failed to get zones from rchain');
  }

  return result.records as NameZone[];
};


export const getTLDs = (names: string[]): string[] =>
  names.map(name => name.replace(/\.dappy$/, '').split('.').slice(-1)[0]);

export const createFetchNameAnswers = (getZonesApi: (names: string[]) => Promise<NameZone[]>) => async (packet: NamePacket): Promise<NamePacket> => {
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

  const tldZones = await getZonesApi(getTLDs(packet.questions.map(q => q.name)));

  return {
    version: '1.0.0',
    type: PacketType.RESPONSE,
    rcode: 0,
    id: 0,
    flags: 0,
    questions: packet.questions,
    answers: getZoneRecords(packet.questions, tldZones),
    additionals: [],
    authorities: []
  };
};

export const dnsQuery = (store: any) => async (req: Request, res: Response) => {
  res.set({
    'content-type': 'application/dns-message',
    'Access-Control-Allow-Origin': '*',
  });

  const queryPacket = dnsPacket.decode(req.body);
  const response = await createFetchNameAnswers(getZones(store))(queryPacket as NamePacket);

  res.send(dnsPacket.encode(response as Packet)); 
};