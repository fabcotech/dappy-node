import { NameZone } from '../../model/NameZone';
import { RR } from '../../model/ResourceRecords';

export const getTLDs = (names: string[]): string[] =>
  names.map(
    (name) =>
      name
        .replace(/\.dappy$/, '')
        .split('.')
        .slice(-1)[0]
  );

export const getRecordName = (
  recordName: string,
  zoneOrigin: string
): string => {
  switch (recordName) {
    case '@':
    case '':
    case undefined:
      return zoneOrigin;
    default:
      return `${recordName}.${zoneOrigin}`;
  }
};

export const normalizeRecords = (
  zone: NameZone,
  records: RR[],
  appendSuffixDappy = false
): RR[] =>
  records.map((record) => ({
    ...record,
    name:
      getRecordName(record.name, zone.origin) +
      (appendSuffixDappy ? '.dappy' : ''),
    ttl: record.ttl || zone.ttl,
  }));
