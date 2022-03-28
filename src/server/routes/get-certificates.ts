import { Request, Response } from 'express';
import {
  NameAnswer,
  NameClass,
  NamePacket,
  PacketType,
  ReturnCode,
} from '../../model/NamePacket';

import { NameZone } from '../../model/NameZone';
import { RecordType } from '../../model/ResourceRecords';
import { getTLDs, normalizeRecords } from './utils';

export type CertificateAnswer = { name: string; data: string };

export const getCertificatesFromZones = (
  names: string[],
  zones: NameZone[]
): NameAnswer[] =>
  names
    .map((name) => {
      const nRecords = zones
        .map((zone) =>
          normalizeRecords(zone, zone.records, /\.dappy$/.test(name))
        )
        .flat();

      return nRecords
        .filter((record) => record.type === 'CERT' && record.name === name)
        .map((record) => ({
          class: 'IN' as NameClass,
          type: RecordType.CERT,
          ttl: record.ttl || 30 * 24 * 60 * 60, // 30 days by default
          name: record.name,
          data: record.data,
        }));
    })
    .flat();

export const createFetchCertificates =
  (getZones: (names: string[]) => Promise<NameZone[]>) =>
  async (names: string[]): Promise<NamePacket> => {
    let tldZones;
    try {
      tldZones = await getZones(getTLDs(names));
    } catch {
      return {
        version: '1.0.0',
        rcode: ReturnCode.SERVFAIL,
        type: PacketType.RESPONSE,
        flags: 0,
        questions: names.map((name) => ({
          class: 'IN',
          name,
          type: RecordType.CERT,
        })),
        answers: [],
        additionals: [],
        authorities: [],
      };
    }
    const certificates = getCertificatesFromZones(names, tldZones);
    return {
      version: '1.0.0',
      rcode:
        certificates.length === 0 ? ReturnCode.NXDOMAIN : ReturnCode.NOERROR,
      type: PacketType.RESPONSE,
      flags: 0,
      questions: names.map((name) => ({
        class: 'IN',
        name,
        type: RecordType.CERT,
      })),
      answers: certificates,
      additionals: [],
      authorities: [],
    };
  };

export const createGetCertificates =
  (getZones: (names: string[]) => Promise<NameZone[]>) =>
  async (req: Request, res: Response) => {
    res.set({
      'Access-Control-Allow-Origin': '*',
    });
    const {
      body: { names },
    } = req;

    const certificates = await createFetchCertificates(getZones)(names);

    res.send(certificates);
  };
