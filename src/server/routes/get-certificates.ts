import { Request, Response } from 'express';

import { NameZone } from '../../model/NameZone';
import { getTLDs, normalizeRecords } from './utils';

export type CertificateAnswer = { name: string; certificate: string };

export const getCertificatesFromZones = (
  names: string[],
  zones: NameZone[]
): CertificateAnswer[] =>
  names
    .map((name) => {
      const nRecords = zones
        .map((zone) =>
          normalizeRecords(zone, zone.records, /\.dappy$/.test(name))
        )
        .flat();

      return nRecords
        .filter((record) => record.type === 'CERT' && record.name === name)
        .map((record) => ({ name: record.name, certificate: record.data }));
    })
    .flat();

export const createFetchCertificates =
  (getZones: (names: string[]) => Promise<NameZone[]>) =>
  async (names: string[]) => {
    let tldZones;
    try {
      tldZones = await getZones(getTLDs(names));
    } catch {
      return {
        rcode: 'SERVFAIL',
        questions: names,
        answers: [],
      };
    }
    const certificates = getCertificatesFromZones(names, tldZones);
    return {
      rcode: certificates.length === 0 ? 'NXDOMAIN' : 'NOERROR',
      questions: names,
      answers: certificates,
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